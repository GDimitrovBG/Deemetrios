package com.deemetrios.tgsaver.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import android.graphics.BitmapFactory
import coil.compose.AsyncImage
import com.deemetrios.tgsaver.tg.ThumbCache
import java.io.File

/**
 * Preview for a media item: the inline minithumbnail shows up instantly, the
 * sharper thumbnail replaces it once TDLib has pulled it down.
 */
@Composable
fun MediaThumbnail(
    thumbFileId: Int?,
    miniThumb: ByteArray?,
    modifier: Modifier = Modifier
) {
    val mini = remember(miniThumb) {
        miniThumb?.let {
            runCatching { BitmapFactory.decodeByteArray(it, 0, it.size) }.getOrNull()
        }
    }
    var path by remember(thumbFileId) { mutableStateOf<String?>(null) }
    LaunchedEffect(thumbFileId) {
        path = runCatching { ThumbCache.path(thumbFileId) }.getOrNull()
    }

    Box(modifier) {
        mini?.let {
            Image(
                bitmap = it.asImageBitmap(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
        path?.let { p ->
            AsyncImage(
                model = File(p),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

fun humanSize(bytes: Long): String = when {
    bytes <= 0 -> "?"
    bytes < 1024 -> "$bytes B"
    bytes < 1024 * 1024 -> "${bytes / 1024} KB"
    bytes < 1024L * 1024 * 1024 ->
        String.format(java.util.Locale.US, "%.1f MB", bytes / 1024.0 / 1024.0)
    else -> String.format(java.util.Locale.US, "%.2f GB", bytes / 1024.0 / 1024.0 / 1024.0)
}

fun humanDuration(sec: Int): String {
    if (sec <= 0) return ""
    val m = sec / 60
    val s = sec % 60
    return String.format(java.util.Locale.US, "%d:%02d", m, s)
}
