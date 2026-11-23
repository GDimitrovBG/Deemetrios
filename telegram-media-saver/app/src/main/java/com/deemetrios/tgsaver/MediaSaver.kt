package com.deemetrios.tgsaver

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.deemetrios.tgsaver.tg.MediaItem
import com.deemetrios.tgsaver.tg.MediaKind
import java.io.File

/**
 * Copies a file that TDLib downloaded into the app cache over to the phone's
 * shared storage so it shows up in Samsung Gallery / My Files.
 */
object MediaSaver {

    const val ALBUM = "Telegram Saver"

    data class Saved(val uri: Uri?, val displayPath: String)

    fun save(context: Context, item: MediaItem, source: File, chatTitle: String): Saved {
        val name = uniqueName(item, chatTitle)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveViaMediaStore(context, item, source, name)
        } else {
            saveLegacy(context, item, source, name)
        }
    }

    private fun uniqueName(item: MediaItem, chatTitle: String): String {
        val safeChat = chatTitle.replace(Regex("[^\\p{L}\\p{N}_. -]"), "").trim().take(28)
        val base = item.suggestedName.substringBeforeLast('.', item.suggestedName)
        val ext = item.suggestedName.substringAfterLast('.', defaultExt(item))
        val prefix = if (safeChat.isBlank()) "" else "${safeChat}_"
        return "$prefix${base}_${item.messageId shr 20}.$ext"
    }

    private fun defaultExt(item: MediaItem) = when (item.kind) {
        MediaKind.PHOTO -> "jpg"
        MediaKind.VIDEO, MediaKind.GIF -> "mp4"
        MediaKind.FILE -> "bin"
    }

    @androidx.annotation.RequiresApi(Build.VERSION_CODES.Q)
    private fun saveViaMediaStore(
        context: Context,
        item: MediaItem,
        source: File,
        name: String
    ): Saved {
        val isVideo = item.kind == MediaKind.VIDEO || item.kind == MediaKind.GIF
        val collection = when {
            item.kind == MediaKind.FILE -> MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            isVideo -> MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            else -> MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        }
        val relative = when {
            item.kind == MediaKind.FILE -> "${Environment.DIRECTORY_DOWNLOADS}/$ALBUM"
            isVideo -> "${Environment.DIRECTORY_MOVIES}/$ALBUM"
            else -> "${Environment.DIRECTORY_PICTURES}/$ALBUM"
        }

        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, item.mimeType)
            put(MediaStore.MediaColumns.RELATIVE_PATH, relative)
            if (item.kind != MediaKind.FILE) {
                // DATE_TAKEN exists on the Images/Video collections only.
                put(MediaStore.MediaColumns.DATE_TAKEN, item.date.toLong() * 1000L)
            }
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }

        val resolver = context.contentResolver
        val uri = resolver.insert(collection, values)
            ?: throw IllegalStateException("Галерията отказа да създаде файл")

        try {
            resolver.openOutputStream(uri)?.use { out ->
                source.inputStream().use { input -> input.copyTo(out, 1 shl 16) }
            } ?: throw IllegalStateException("Няма достъп за запис")
        } catch (e: Throwable) {
            runCatching { resolver.delete(uri, null, null) }
            throw e
        }

        resolver.update(uri, ContentValues().apply {
            put(MediaStore.MediaColumns.IS_PENDING, 0)
        }, null, null)

        return Saved(uri, "$relative/$name")
    }

    private fun saveLegacy(
        context: Context,
        item: MediaItem,
        source: File,
        name: String
    ): Saved {
        val isVideo = item.kind == MediaKind.VIDEO || item.kind == MediaKind.GIF
        val dirType = when {
            item.kind == MediaKind.FILE -> Environment.DIRECTORY_DOWNLOADS
            isVideo -> Environment.DIRECTORY_MOVIES
            else -> Environment.DIRECTORY_PICTURES
        }
        val dir = File(Environment.getExternalStoragePublicDirectory(dirType), ALBUM)
        dir.mkdirs()
        val target = File(dir, name)
        source.inputStream().use { input ->
            target.outputStream().use { out -> input.copyTo(out, 1 shl 16) }
        }
        MediaScannerConnection.scanFile(
            context, arrayOf(target.absolutePath), arrayOf(item.mimeType), null
        )
        return Saved(null, target.absolutePath)
    }
}
