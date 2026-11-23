package com.deemetrios.tgsaver.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val TgBlue = Color(0xFF2AABEE)
private val TgBlueDark = Color(0xFF0F7FB8)

private val Light = lightColorScheme(
    primary = TgBlueDark,
    secondary = Color(0xFF4A6572),
    background = Color(0xFFF7F9FB),
    surface = Color(0xFFFFFFFF)
)

private val Dark = darkColorScheme(
    primary = TgBlue,
    secondary = Color(0xFF9FB8C6),
    background = Color(0xFF10171C),
    surface = Color(0xFF17212B)
)

@Composable
fun TgSaverTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Dark else Light,
        content = content
    )
}
