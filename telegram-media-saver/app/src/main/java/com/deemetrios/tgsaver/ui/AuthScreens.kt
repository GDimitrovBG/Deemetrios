package com.deemetrios.tgsaver.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
private fun Shell(
    title: String,
    subtitle: String,
    busy: Boolean,
    error: String?,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Spacer(Modifier.height(32.dp))
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(8.dp))
        content()
        if (busy) {
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        error?.let {
            Spacer(Modifier.height(8.dp))
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Text(
                    it,
                    Modifier.padding(12.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
fun SetupScreen(busy: Boolean, error: String?, onSave: (String, String) -> Unit) {
    var apiId by remember { mutableStateOf("") }
    var apiHash by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf<String?>(null) }

    Shell(
        title = "Първоначална настройка",
        subtitle = "Приложението влиза в Telegram с твоя акаунт през официалната библиотека " +
            "TDLib. За това Telegram изисква твои собствени api_id и api_hash.",
        busy = busy,
        error = localError ?: error
    ) {
        Card {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Как да ги вземеш:", fontWeight = FontWeight.SemiBold)
                Text("1. Отвори my.telegram.org в браузъра на телефона.", style = MaterialTheme.typography.bodySmall)
                Text("2. Влез с телефонния си номер (код идва в Telegram).", style = MaterialTheme.typography.bodySmall)
                Text("3. Избери „API development tools“.", style = MaterialTheme.typography.bodySmall)
                Text("4. Създай приложение (име и платформа по избор).", style = MaterialTheme.typography.bodySmall)
                Text("5. Копирай App api_id и App api_hash тук.", style = MaterialTheme.typography.bodySmall)
            }
        }
        OutlinedTextField(
            value = apiId,
            onValueChange = { apiId = it.filter { ch -> ch.isDigit() } },
            label = { Text("api_id") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = apiHash,
            onValueChange = { apiHash = it.trim() },
            label = { Text("api_hash") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = {
                localError = null
                onSave(apiId, apiHash)
            },
            enabled = !busy && apiId.isNotBlank() && apiHash.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        ) { Text("Запази и продължи") }
        Text(
            "Данните остават само на този телефон.",
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
fun PhoneScreen(
    busy: Boolean,
    error: String?,
    onSubmit: (String) -> Unit,
    onResetApi: () -> Unit
) {
    var phone by remember { mutableStateOf("+359") }
    Shell(
        title = "Вход в Telegram",
        subtitle = "Въведи телефонния номер на акаунта, с международен код.",
        busy = busy,
        error = error
    ) {
        OutlinedTextField(
            value = phone,
            onValueChange = { phone = it },
            label = { Text("Телефон") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = { onSubmit(phone.filter { it.isDigit() || it == '+' }) },
            enabled = !busy && phone.length > 6,
            modifier = Modifier.fillMaxWidth()
        ) { Text("Изпрати код") }
        TextButton(onClick = onResetApi, modifier = Modifier.fillMaxWidth()) {
            Text("Смени api_id / api_hash")
        }
    }
}

@Composable
fun CodeScreen(phone: String, busy: Boolean, error: String?, onSubmit: (String) -> Unit) {
    var code by remember { mutableStateOf("") }
    Shell(
        title = "Код за потвърждение",
        subtitle = if (phone.isBlank()) {
            "Telegram изпрати код — провери другите си устройства или SMS."
        } else {
            "Код за $phone. Ако вече имаш Telegram на друго устройство, кодът идва там."
        },
        busy = busy,
        error = error
    ) {
        OutlinedTextField(
            value = code,
            onValueChange = { code = it.filter { ch -> ch.isDigit() }.take(6) },
            label = { Text("Код") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = { onSubmit(code) },
            enabled = !busy && code.length >= 4,
            modifier = Modifier.fillMaxWidth()
        ) { Text("Потвърди") }
    }
}

@Composable
fun PasswordScreen(hint: String, busy: Boolean, error: String?, onSubmit: (String) -> Unit) {
    var pass by remember { mutableStateOf("") }
    Shell(
        title = "Двустъпкова защита",
        subtitle = if (hint.isBlank()) "Въведи паролата за облачна защита." else "Подсказка: $hint",
        busy = busy,
        error = error
    ) {
        OutlinedTextField(
            value = pass,
            onValueChange = { pass = it },
            label = { Text("Парола") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = { onSubmit(pass) },
            enabled = !busy && pass.isNotEmpty(),
            modifier = Modifier.fillMaxWidth()
        ) { Text("Влез") }
    }
}

@Composable
fun MessageScreen(
    title: String,
    text: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(text, style = MaterialTheme.typography.bodyMedium)
            if (actionLabel != null && onAction != null) {
                Button(onClick = onAction) { Text(actionLabel) }
            }
        }
    }
}
