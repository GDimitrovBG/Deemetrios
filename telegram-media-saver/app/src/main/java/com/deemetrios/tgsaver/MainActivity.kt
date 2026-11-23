package com.deemetrios.tgsaver

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.deemetrios.tgsaver.tg.AuthStage
import com.deemetrios.tgsaver.ui.*

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TgSaverTheme {
                Surface(Modifier) {
                    AppRoot()
                }
            }
        }
    }
}

@Composable
private fun AppRoot() {
    val vm: MainViewModel = viewModel()
    val ui by vm.ui.collectAsState()
    val auth by vm.auth.collectAsState()
    val downloads by vm.downloads.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    // Needed for the download progress notification on Android 13+.
    val notifPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }
    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    LaunchedEffect(ui.error, ui.info) {
        val msg = ui.error ?: ui.info
        if (msg != null) {
            snackbar.showSnackbar(msg)
            vm.dismissMessages()
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { outer ->
        Box(Modifier.padding(outer)) {
            when {
                ui.needsSetup -> SetupScreen(ui.busy, ui.error) { id, hash ->
                    vm.saveApiCredentials(id, hash)
                }

                else -> when (val stage = auth) {
                    is AuthStage.Starting ->
                        MessageScreen("Стартиране…", "Свързване с Telegram.")

                    is AuthStage.NeedApiCredentials -> SetupScreen(ui.busy, ui.error) { id, hash ->
                        vm.saveApiCredentials(id, hash)
                    }

                    is AuthStage.WaitPhone -> PhoneScreen(
                        busy = ui.busy,
                        error = ui.error,
                        onSubmit = vm::submitPhone,
                        onResetApi = vm::forgetApiCredentials
                    )

                    is AuthStage.WaitCode ->
                        CodeScreen(stage.phone, ui.busy, ui.error, vm::submitCode)

                    is AuthStage.WaitPassword ->
                        PasswordScreen(stage.hint, ui.busy, ui.error, vm::submitPassword)

                    is AuthStage.WaitOtherDevice -> MessageScreen(
                        "Потвърждение от друго устройство",
                        "Отвори Telegram на друго устройство и потвърди: ${stage.link}"
                    )

                    is AuthStage.WaitRegistration -> MessageScreen(
                        "Нужен е регистриран акаунт",
                        "Този номер няма Telegram акаунт. Регистрирай се в официалното приложение."
                    )

                    is AuthStage.Failed -> MessageScreen(
                        title = "Проблем при вход",
                        text = stage.reason + "\n\nНай-честата причина са грешни api_id / api_hash.",
                        actionLabel = "Въведи api_id / api_hash отново",
                        onAction = vm::forgetApiCredentials
                    )

                    is AuthStage.LoggedOut -> MessageScreen(
                        title = "Излязохте от акаунта",
                        text = "Сесията е затворена.",
                        actionLabel = "Влез отново",
                        onAction = vm::restartClient
                    )

                    is AuthStage.Ready -> {
                        val chat = ui.openChat
                        if (chat == null) {
                            ChatsScreen(
                                chats = ui.chats,
                                query = ui.chatQuery,
                                busy = ui.busy,
                                onQuery = vm::setChatQuery,
                                onOpen = vm::openChat,
                                onRefresh = vm::loadChats,
                                onLogout = vm::logOut
                            )
                        } else {
                            MediaScreen(
                                chatTitle = chat.title,
                                items = ui.media,
                                filter = ui.filter,
                                scanning = ui.scanning,
                                scanned = ui.scanned,
                                selected = ui.selected,
                                downloads = downloads,
                                onBack = vm::closeChat,
                                onFilter = vm::setFilter,
                                onToggle = vm::toggle,
                                onSelectAll = vm::selectAll,
                                onClearSelection = vm::clearSelection,
                                onDownload = vm::downloadSelected,
                                onCancelDownloads = vm::cancelDownloads
                            )
                        }
                    }
                }
            }
        }
    }
}
