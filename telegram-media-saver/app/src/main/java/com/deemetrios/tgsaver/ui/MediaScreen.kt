package com.deemetrios.tgsaver.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.deemetrios.tgsaver.DownloadState
import com.deemetrios.tgsaver.tg.MediaFilter
import com.deemetrios.tgsaver.tg.MediaItem
import com.deemetrios.tgsaver.tg.MediaKind

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MediaScreen(
    chatTitle: String,
    items: List<MediaItem>,
    filter: MediaFilter,
    scanning: Boolean,
    scanned: Int,
    selected: Set<String>,
    downloads: DownloadState,
    onBack: () -> Unit,
    onFilter: (MediaFilter) -> Unit,
    onToggle: (MediaItem) -> Unit,
    onSelectAll: () -> Unit,
    onClearSelection: () -> Unit,
    onDownload: () -> Unit,
    onCancelDownloads: () -> Unit
) {
    val totalBytes = items
        .filter { selected.isEmpty() || it.uniqueKey in selected }
        .sumOf { it.fileSize }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(chatTitle, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            if (scanning) "Сканиране… намерени ${items.size}"
                            else "${items.size} файла" +
                                if (selected.isNotEmpty()) " · избрани ${selected.size}" else "",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Назад")
                    }
                }
            )
        },
        bottomBar = {
            Surface(tonalElevation = 3.dp) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    if (downloads.total > 0) {
                        DownloadProgress(downloads, onCancelDownloads)
                        Spacer(Modifier.height(6.dp))
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TextButton(
                            onClick = if (selected.isEmpty()) onSelectAll else onClearSelection
                        ) {
                            Text(if (selected.isEmpty()) "Избери всички" else "Изчисти")
                        }
                        Spacer(Modifier.weight(1f))
                        Button(
                            onClick = onDownload,
                            enabled = items.isNotEmpty()
                        ) {
                            Icon(Icons.Default.Download, null)
                            Spacer(Modifier.width(6.dp))
                            Text(
                                if (selected.isEmpty()) "Свали всички (${humanSize(totalBytes)})"
                                else "Свали ${selected.size} (${humanSize(totalBytes)})"
                            )
                        }
                    }
                }
            }
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            LazyRow(
                Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(MediaFilter.entries.toList()) { f ->
                    FilterChip(
                        selected = f == filter,
                        onClick = { onFilter(f) },
                        label = { Text(f.label) }
                    )
                }
            }
            if (scanning) LinearProgressIndicator(Modifier.fillMaxWidth())

            if (items.isEmpty() && !scanning) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Няма медия за този филтър")
                }
            }

            LazyVerticalGrid(
                columns = GridCells.Adaptive(110.dp),
                contentPadding = PaddingValues(6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(items, key = { it.uniqueKey }) { item ->
                    MediaCell(
                        item = item,
                        checked = item.uniqueKey in selected,
                        onClick = { onToggle(item) }
                    )
                }
            }
        }
    }
}

@Composable
private fun MediaCell(item: MediaItem, checked: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .aspectRatio(1f)
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .then(
                if (checked) Modifier.border(
                    3.dp,
                    MaterialTheme.colorScheme.primary,
                    RoundedCornerShape(10.dp)
                ) else Modifier
            )
            .clickable(onClick = onClick)
    ) {
        if (item.kind == MediaKind.FILE) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.InsertDriveFile, null, Modifier.size(36.dp))
            }
        } else {
            MediaThumbnail(item.thumbFileId, item.miniThumb, Modifier.fillMaxSize())
        }

        if (item.kind == MediaKind.VIDEO || item.kind == MediaKind.GIF) {
            Icon(
                Icons.Default.PlayCircle,
                null,
                tint = Color.White,
                modifier = Modifier.align(Alignment.Center).size(30.dp)
            )
        }

        Row(
            Modifier
                .align(Alignment.BottomStart)
                .fillMaxWidth()
                .background(Color.Black.copy(alpha = 0.45f))
                .padding(horizontal = 5.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                humanSize(item.fileSize),
                color = Color.White,
                style = MaterialTheme.typography.labelSmall
            )
            Spacer(Modifier.weight(1f))
            if (item.durationSec > 0) {
                Text(
                    humanDuration(item.durationSec),
                    color = Color.White,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }

        if (checked) {
            Icon(
                Icons.Default.CheckCircle,
                null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(22.dp)
            )
        }
    }
}

@Composable
private fun DownloadProgress(state: DownloadState, onCancel: () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Свалени ${state.completed}/${state.total}" +
                    if (state.failed > 0) " · ${state.failed} с грешка" else "",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium
            )
            Spacer(Modifier.weight(1f))
            if (state.running) {
                TextButton(onClick = onCancel) { Text("Спри") }
            }
        }
        LinearProgressIndicator(
            progress = { state.overallPercent / 100f },
            modifier = Modifier.fillMaxWidth()
        )
        state.active.take(2).forEach { a ->
            Text(
                "${a.name} — ${a.percent}%",
                style = MaterialTheme.typography.labelSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        state.lastSavedPath?.let {
            if (!state.running) {
                Text(
                    "Последно записано: $it",
                    style = MaterialTheme.typography.labelSmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
