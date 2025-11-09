# Discord Support Ticket Bot

Bot de tickets de soporte para servidor de Discord.

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar el archivo `.env`:
   - DISCORD_TOKEN: Token del bot
   - CLIENT_ID: ID de la aplicación del bot
   - GUILD_ID: Ya configurado (1128489481935274054)
   - TICKET_CATEGORY_ID: ID de la categoría donde se crearán los tickets
   - STAFF_LOG_CHANNEL_ID: ID del canal para notificaciones de staff

3. Crear el bot en Discord Developer Portal

4. Invitar el bot con permisos de Administrator

5. Iniciar el bot:
```bash
npm start
```

6. Usar `/setup-support` para crear el panel

## Características

- 🎫 Sistema de tickets de soporte profesional
- 📋 6 tipos de problemas predefinidos
- 🔒 Tickets privados (solo usuario y admins)
- 📢 Notificaciones automáticas al staff
- 💬 Menú de selección de tipo de problema
- ✅ Confirmación antes de cerrar tickets
- 🎨 Diseño mint (#00D9A3) consistente
- 🔐 Solo administradores ven los tickets
- 📊 Sistema de IDs únicos por ticket

## Tipos de Problemas

- ❓ General Question
- 🛠️ Technical Issue
- 💳 Payment/Billing
- 👤 Account Issue
- 📦 Product Support
- ⚠️ Report Issue
