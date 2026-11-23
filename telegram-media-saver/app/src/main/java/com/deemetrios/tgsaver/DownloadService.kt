package com.deemetrios.tgsaver

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/** Keeps downloads alive while the app is in the background. */
class DownloadService : Service() {

    private val scope = CoroutineScope(Dispatchers.Main)
    private var watchingProgress = false

    companion object {
        private const val CHANNEL_ID = "downloads"
        private const val NOTIF_ID = 42

        fun start(context: Context) {
            val intent = Intent(context, DownloadService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification("Подготовка…", 0, 0))

        if (!com.deemetrios.tgsaver.tg.TgClient.isStarted()) {
            // Process was restarted without the UI: nothing to download.
            stopSelf()
            return START_NOT_STICKY
        }

        Downloader.ensureRunning(applicationContext) {
            scope.launch { stopSelf() }
        }

        if (watchingProgress) return START_NOT_STICKY
        watchingProgress = true

        scope.launch {
            Downloader.state.collectLatest { s ->
                val text = if (s.total == 0) {
                    "Подготовка…"
                } else {
                    "Свалени ${s.completed} от ${s.total}" +
                        if (s.failed > 0) " · ${s.failed} с грешка" else ""
                }
                notificationManager().notify(
                    NOTIF_ID,
                    buildNotification(text, s.overallPercent, s.total)
                )
            }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        scope.coroutineContext[kotlinx.coroutines.Job]?.cancel()
        super.onDestroy()
    }

    private fun notificationManager() =
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Сваляне на медия",
                NotificationManager.IMPORTANCE_LOW
            )
            notificationManager().createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String, percent: Int, total: Int): Notification {
        val tapIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TG Media Saver")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(tapIntent)
            .apply { if (total > 0) setProgress(100, percent, false) }
            .build()
    }
}
