package com.deemetrios.tgsaver.tg

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.drinkless.tdlib.TdApi
import java.io.File
import java.util.concurrent.ConcurrentHashMap

/** Downloads and remembers the small previews used by the media grid. */
object ThumbCache {

    private val paths = ConcurrentHashMap<Int, String>()
    private val locks = ConcurrentHashMap<Int, Mutex>()

    suspend fun path(fileId: Int?): String? {
        if (fileId == null || fileId == 0) return null
        paths[fileId]?.let { if (File(it).exists()) return it }
        val lock = locks.getOrPut(fileId) { Mutex() }
        return lock.withLock {
            paths[fileId]?.let { if (File(it).exists()) return@withLock it }
            val file = TgClient.sendOrNull(TdApi.DownloadFile(fileId, 1, 0, 0, true))
            val p = file?.local?.path
            if (!p.isNullOrBlank() && File(p).exists()) {
                paths[fileId] = p
                p
            } else {
                null
            }
        }
    }
}
