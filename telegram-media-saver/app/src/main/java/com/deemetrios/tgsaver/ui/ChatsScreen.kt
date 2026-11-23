package com.deemetrios.tgsaver.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.deemetrios.tgsaver.tg.ChatItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatsScreen(
    chats: List<ChatItem>,
    query: String,
    busy: Boolean,
    onQuery: (String) -> Unit,
    onOpen: (ChatItem) -> Unit,
    onRefresh: () -> Unit,
    onLogout: () -> Unit
) {
    val filtered = if (query.isBlank()) chats else
        chats.filter { it.title.contains(query, ignoreCase = true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Избери чат") },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.Refresh, contentDescription = "Презареди")
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, contentDescription = "Изход")
                    }
                }
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = onQuery,
                leadingIcon = { Icon(Icons.Default.Search, null) },
                placeholder = { Text("Търси чат…") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp)
            )
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            if (filtered.isEmpty() && !busy) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Няма намерени чатове")
                }
            }
            LazyColumn(Modifier.fillMaxSize()) {
                items(filtered, key = { it.id }) { chat ->
                    ListItem(
                        headlineContent = {
                            Text(
                                chat.title,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                fontWeight = FontWeight.Medium
                            )
                        },
                        supportingContent = { Text(chat.kind) },
                        leadingContent = {
                            MediaThumbnail(
                                thumbFileId = chat.photoFileId,
                                miniThumb = chat.photoMinithumb,
                                modifier = Modifier.size(44.dp).clip(CircleShape)
                            )
                        },
                        modifier = Modifier.clickable { onOpen(chat) }
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}
