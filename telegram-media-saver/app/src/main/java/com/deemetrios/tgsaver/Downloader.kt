package com.deemetrios.tgsaver

import android.content.Context
import com.deemetrios.tgsaver.tg.MediaItem
import com.deemetrios.tgsaver.tg.TgClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.isActive
import org.drinkless.tdlib.TdApi
import java.io.File
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicInteger

data class ActiveDownload(
    val key: String,
    val name: String,
    val percent: Int,
    val downloadedBytes: Long,
    val totalBytes: Long
)

data class DownloadState(
    val running: Boolean = false,
    val total: Int = 0,
    val completed: Int = 0,
    val failed: Int = 0,
    val active: List<ActiveDownload> = emptyList(),
    val lastSavedPath: String? = null,
    val lastError: String? = null
) {
    val remaining: Int get() = (total - completed - failed).coerceAtLeast(0)
    val overallPercent: Int
        get() = if (total == 0) 0 else ((completed + failed) * 100 / total)
}

/** Download queue shared by the UI and the foreground service. */
object Downloader {

    private const val PARALLEL = 3

    private data class QueueEntry(val item: MediaItem, val chatTitle: String)

    private val queue = ConcurrentLinkedQueue<QueueEntry>()
    private val total = AtomicInteger(0)
    private val completed = AtomicInteger(0)
    private val failed = AtomicInteger(0)
    private val activeMap = java.util.concurrent.ConcurrentHashMap<String, ActiveDownload>()

    private val _state = MutableStateFlow(DownloadState())
    val state: StateFlow<DownloadState> = _state.asStateFlow()

    private var job: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO)

    fun enqueue(items: List<MediaItem>, chatTitle: String) {
        items.forEach { queue.add(QueueEntry(it, chatTitle)) }
        total.addAndGet(items.size)
        publish()
    }

    fun isIdle(): Boolean = queue.isEmpty() && activeMap.isEmpty()

    fun cancelAll() {
        queue.clear()
        job?.cancel()
        job = null
        activeMap.clear()
        total.set(completed.get() + failed.get())
        publish(running = false)
    }

    fun resetCounters() {
        if (!isIdle()) return
        total.set(0); completed.set(0); failed.set(0)
        _state.value = DownloadState()
    }

    /** Starts the worker if it is not already running. Safe to call repeatedly. */
    fun ensureRunning(context: Context, onFinished: () -> Unit) {
        if (job?.isActive == true) return
        job = scope.launch {
            publish(running = true)
            try {
                work(context.applicationContext)
            } finally {
                activeMap.clear()
                publish(running = false)
                onFinished()
            }
        }
    }

    private suspend fun work(context: Context) = coroutineScope {
        val gate = Semaphore(PARALLEL)
        val progressJob = launch {
            TgClient.fileUpdates.collect { file ->
                val entry = activeMap.values.firstOrNull { it.key.endsWith(":${file.id}") }
                if (entry != null) {
                    val totalBytes = if (file.size > 0) file.size else file.expectedSize
                    val done = file.local?.downloadedSize ?: 0L
                    val pct = if (totalBytes > 0) (done * 100 / totalBytes).toInt() else 0
                    activeMap[entry.key] = entry.copy(
                        percent = pct.coerceIn(0, 100),
                        downloadedBytes = done,
                        totalBytes = totalBytes
                    )
                    publish()
                }
            }
        }

        // Outer loop: items queued while the workers were winding down still run.
        while (isActive && queue.isNotEmpty()) {
            val workers = (1..PARALLEL).map {
                launch {
                    while (isActive) {
                        val entry = queue.poll() ?: break
                        gate.withPermit { processOne(context, entry) }
                    }
                }
            }
            workers.forEach { it.join() }
        }
        progressJob.cancel()
    }

    private suspend fun processOne(context: Context, entry: QueueEntry) {
        val item = entry.item
        val key = item.uniqueKey
        activeMap[key] = ActiveDownload(
            key = key,
            name = item.suggestedName,
            percent = 0,
            downloadedBytes = 0,
            totalBytes = item.fileSize
        )
        publish()
        try {
            // synchronous = true -> TDLib answers only once the file is fully downloaded
            val file = TgClient.send(TdApi.DownloadFile(item.fileId, 24, 0, 0, true))
            val path = file.local?.path
            if (path.isNullOrBlank() || !File(path).exists()) {
                throw IllegalStateException("Файлът не беше свален")
            }
            val saved = withContext(Dispatchers.IO) {
                MediaSaver.save(context, item, File(path), entry.chatTitle)
            }
            // Free the app-private cache copy; the gallery copy stays.
            TgClient.sendOrNull(TdApi.DeleteFile(item.fileId))
            completed.incrementAndGet()
            activeMap.remove(key)
            publish(lastSaved = saved.displayPath)
        } catch (e: Throwable) {
            failed.incrementAndGet()
            activeMap.remove(key)
            publish(lastError = "${item.suggestedName}: ${e.message ?: "грешка"}")
        }
    }

    private fun publish(
        running: Boolean? = null,
        lastSaved: String? = null,
        lastError: String? = null
    ) {
        val current = _state.value
        _state.value = current.copy(
            running = running ?: current.running,
            total = total.get(),
            completed = completed.get(),
            failed = failed.get(),
            active = activeMap.values.sortedBy { it.name },
            lastSavedPath = lastSaved ?: current.lastSavedPath,
            lastError = lastError ?: current.lastError
        )
    }
}
