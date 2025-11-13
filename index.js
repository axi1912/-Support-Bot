require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, REST, Routes } = require('discord.js');
const db = require('./Data/db-mongo');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Almacenamiento temporal de tickets activos
const activeTickets = new Map();

// Definir comandos slash
const commands = [
    {
        name: 'setup-support',
        description: 'Setup the support ticket panel'
    }
];

client.once('ready', async () => {
    // Conectar a MongoDB
    await db.connectDB();
    await db.initStats();

    
    
    console.log

        console.log(`✅ Support Bot connected as ${client.user.tag}`);
    
    // Establecer estado de actividad
    client.user.setPresence({
        activities: [{ name: 'Customer Support', type: 2 }], // Type 2 = LISTENING
        status: 'online'
    });
    
    // Registrar comandos slash
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('📝 Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash commands registered successfully');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

// Función para crear el panel de soporte
async function setupSupportPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('🎫 SUPPORT TICKETS')
        .setDescription('Need help? Create a support ticket and our team will assist you!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
            {
                name: '\n📋 When to Create a Ticket',
                value: '• Questions about our services\n• Technical issues or problems\n• Account or payment support\n• General inquiries',
                inline: false
            },
            {
                name: '\n⚡ What to Expect',
                value: '• Quick response from our team\n• Private and secure communication\n• Professional assistance\n• Complete problem resolution',
                inline: false
            },
            {
                name: '\n🎯 How It Works',
                value: '**1.** Click the button below\n**2.** Select your issue type\n**3.** Describe your problem\n**4.** Wait for staff response',
                inline: false
            }
        )
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1438385544043430030/banner_factory.gif?ex=6916b06d&is=69155eed&hm=cc3d8842a292692983ed0ccf4114f3baf53681b386260983a513862de799d17e&')
        .setFooter({ text: '🎫 Support System • We\'re here to help!' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_support_ticket')
                .setLabel('📩 Create Support Ticket')
                .setStyle(ButtonStyle.Primary)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Manejo de interacciones
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.replied || interaction.deferred) {
            return;
        }

        // Comandos slash
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setup-support') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Only administrators can use this command.', 
                        ephemeral: true 
                    });
                }
                
                await interaction.reply({ content: '⏳ Creating support panel...', ephemeral: true });
                await setupSupportPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Support panel created successfully!' });
            }
            return;
        }

        // Botón para crear ticket
        if (interaction.isButton()) {
            if (interaction.customId === 'create_support_ticket') {
                await interaction.reply({ content: '⏳ Creating your support ticket...', ephemeral: true });
                await handleTicketCreation(interaction);
            } else if (interaction.customId === 'close_ticket') {
                await closeTicketButton(interaction);
            } else if (interaction.customId === 'close_confirm') {
                await confirmCloseTicket(interaction);
            } else if (interaction.customId === 'close_cancel') {
                await interaction.update({ content: '❌ Ticket closure cancelled.', components: [] });
            }
            return;
        }

        // Menú de selección de tipo de problema
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_issue_type') {
                await handleIssueSelection(interaction);
            }
        }
    } catch (error) {
        console.error('Error in interaction:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
            }
        } catch (err) {
            console.error('Error responding to error:', err);
        }
    }
});

// Crear ticket de soporte
async function handleTicketCreation(interaction) {
    // Verificar si el usuario ya tiene un ticket abierto
    const existingTicket = interaction.guild.channels.cache.find(
        ch => ch.name === `support-${interaction.user.username.toLowerCase()}` && ch.type === ChannelType.GuildText
    );

    if (existingTicket) {
        return interaction.editReply({ 
            content: `❌ You already have an open ticket: ${existingTicket}`
        });
    }

    try {
        // Crear canal de ticket
        const ticketChannel = await interaction.guild.channels.create({
            name: `support-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: process.env.TICKET_CATEGORY_ID || null,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        // Dar permisos a administradores
        const adminMembers = interaction.guild.members.cache.filter(member => 
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        for (const [memberId, member] of adminMembers) {
            await ticketChannel.permissionOverwrites.create(memberId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }

        // Guardar ticket en memoria
        activeTickets.set(ticketChannel.id, {
            userId: interaction.user.id,
            createdAt: Date.now()
        });

        // Guardar en base de datos JSON
        const ticketId = Math.floor(Math.random() * 9000) + 1000;
        db.addTicket({
            id: ticketId,
            channelId: ticketChannel.id,
            userId: interaction.user.id,
            username: interaction.user.tag,
            type: 'Support',
            status: 'open',
            createdAt: new Date().toISOString()
        });

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00D9A3')
            .setTitle('🎫 Support Ticket Created')
            .setDescription(`Hello ${interaction.user}! Welcome to your support ticket.\n\n**Please select the type of issue you're experiencing:**`)
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_issue_type')
            .setPlaceholder('Select your issue type')
            .addOptions([
                {
                    label: '❓ General Question',
                    description: 'General inquiries or questions',
                    value: 'general'
                },
                {
                    label: '🛠️ Technical Issue',
                    description: 'Technical problems or bugs',
                    value: 'technical'
                },
                {
                    label: '💳 Payment/Billing',
                    description: 'Payment or billing related issues',
                    value: 'payment'
                },
                {
                    label: '👤 Account Issue',
                    description: 'Account access or settings',
                    value: 'account'
                },
                {
                    label: '📦 Product Support',
                    description: 'Help with products or services',
                    value: 'product'
                },
                {
                    label: '⚠️ Report Issue',
                    description: 'Report a problem or violation',
                    value: 'report'
                }
            ]);

        const row1 = new ActionRowBuilder().addComponents(selectMenu);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({ 
            content: `${interaction.user}`,
            embeds: [welcomeEmbed], 
            components: [row1, row2] 
        });

        await interaction.editReply({ 
            content: `✅ Your support ticket has been created: ${ticketChannel}` 
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        try {
            await interaction.editReply({ 
                content: '❌ There was an error creating your ticket. Please contact an administrator.' 
            });
        } catch (e) {
            console.error('Could not edit reply:', e);
        }
    }
}

// Manejar selección de tipo de problema
async function handleIssueSelection(interaction) {
    const issueTypes = {
        'general': '❓ General Question',
        'technical': '🛠️ Technical Issue',
        'payment': '💳 Payment/Billing',
        'account': '👤 Account Issue',
        'product': '📦 Product Support',
        'report': '⚠️ Report Issue'
    };

    const selectedIssue = interaction.values[0];
    const issueLabel = issueTypes[selectedIssue];

    const ticketId = Math.floor(Math.random() * 9000) + 1000;
    
    const ticketInfoEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setDescription(`🎫 **Ticket ID:** \`${ticketId}\`\n👤 **Ticket Owner:** \`${interaction.user.tag}\`\n📋 **Issue Type:** \`${issueLabel}\`\n⚠️ **Reminder:** \`Please be patient while waiting for staff\``)
        .setFooter({ text: 'Support Tickets' });

    const issueEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('✅ Issue Type Selected')
        .setDescription(`**${issueLabel}**\n\n📝 Please describe your issue in detail below.\nA staff member will be with you shortly.\n\n**Tips for faster support:**\n• Be clear and specific\n• Include relevant details\n• Attach screenshots if needed`)
        .setTimestamp();

    await interaction.reply({ embeds: [ticketInfoEmbed, issueEmbed] });

    // Notificar al staff
    if (process.env.STAFF_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.STAFF_LOG_CHANNEL_ID);
            
            const staffNotification = new EmbedBuilder()
                .setColor('#00D9A3')
                .setTitle('🔔 New Support Ticket')
                .setDescription(`A user has created a support ticket`)
                .addFields(
                    { name: '👤 User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: '📋 Issue Type', value: issueLabel, inline: true },
                    { name: '🎫 Ticket Channel', value: `${interaction.channel}`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [staffNotification] });
        } catch (error) {
            console.error('Error sending staff notification:', error);
        }
    }
}

// Cerrar ticket con botón
async function closeTicketButton(interaction) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⚠️ Confirm Ticket Closure')
        .setDescription('Are you sure you want to close this ticket?\n\nThis action cannot be undone.');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_confirm')
                .setLabel('✅ Yes, Close')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('close_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
}

// Confirmar cierre de ticket
async function confirmCloseTicket(interaction) {
    await interaction.update({ content: '🔒 Closing ticket...', embeds: [], components: [] });

    const channel = interaction.channel;
    
    const closingEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Ticket closed by ${interaction.user}\n\nThis channel will be deleted in 5 seconds.\n\nThank you for contacting support!`)
        .setTimestamp();

    await channel.send({ embeds: [closingEmbed] });

    activeTickets.delete(channel.id);

    // Marcar ticket como cerrado en base de datos
    const allData = await db.readData();
    const ticket = allData.tickets.find(t => t.channelId === channel.id);
    if (ticket) {
        db.closeTicket(ticket.id);
    }

    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (error) {
            console.error('Error deleting channel:', error);
        }
    }, 5000);
}

// Manejo de errores
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN);


