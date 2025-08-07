import { PrismaClient, NotificationType, NotificationChannel } from 'generated/prisma';

const prisma = new PrismaClient();

async function seedNotificationTemplates() {
  console.log('🌱 Seeding notification templates...');

  const templates = [
    // Email Templates
    {
      name: 'medication_reminder_email',
      type: NotificationType.MEDICATION_REMINDER,
      channel: NotificationChannel.EMAIL,
      title: 'Medication Reminder - {{medicationName}}',
      content: `
Dear {{seniorName}},

This is a friendly reminder that it's time to take your medication:

**Medication:** {{medicationName}}
**Dosage:** {{dosage}}
**Time:** {{scheduledTime}}
**Instructions:** {{instructions}}

Please take your medication now and confirm when you've taken it.

If you have any questions or concerns, please contact your caregiver.

Best regards,
Your Care Team
      `,
      variables: ['seniorName', 'medicationName', 'dosage', 'scheduledTime', 'instructions'],
    },
    {
      name: 'missed_dose_alert_email',
      type: NotificationType.MISSED_DOSE_ALERT,
      channel: NotificationChannel.EMAIL,
      title: 'Missed Medication Alert - {{medicationName}}',
      content: `
Dear {{seniorName}},

We noticed that you haven't confirmed taking your medication:

**Medication:** {{medicationName}}
**Dosage:** {{dosage}}
**Scheduled Time:** {{scheduledTime}}

Please take your medication as soon as possible and confirm when you've taken it.

If you're experiencing any issues or side effects, please contact your caregiver immediately.

Best regards,
Your Care Team
      `,
      variables: ['seniorName', 'medicationName', 'dosage', 'scheduledTime'],
    },
    {
      name: 'escalation_alert_email',
      type: NotificationType.ESCALATION_ALERT,
      channel: NotificationChannel.EMAIL,
      title: 'Medication Alert - {{seniorName}}',
      content: `
Dear {{caregiverName}},

{{seniorName}} has not confirmed taking their medication:

**Medication:** {{medicationName}}
**Dosage:** {{dosage}}
**Scheduled Time:** {{scheduledTime}}
**Time Since Due:** {{timeSinceDue}}

Please check on {{seniorName}} and ensure they take their medication.

Best regards,
Senior Care Platform
      `,
      variables: ['caregiverName', 'seniorName', 'medicationName', 'dosage', 'scheduledTime', 'timeSinceDue'],
    },

    // SMS Templates
    {
      name: 'medication_reminder_sms',
      type: NotificationType.MEDICATION_REMINDER,
      channel: NotificationChannel.SMS,
      title: 'Medication Reminder',
      content: `Hi {{seniorName}}, it's time to take {{medicationName}} ({{dosage}}). Please confirm when taken.`,
      variables: ['seniorName', 'medicationName', 'dosage'],
    },
    {
      name: 'missed_dose_alert_sms',
      type: NotificationType.MISSED_DOSE_ALERT,
      channel: NotificationChannel.SMS,
      title: 'Missed Medication',
      content: `{{seniorName}}, you haven't confirmed taking {{medicationName}}. Please take it now and confirm.`,
      variables: ['seniorName', 'medicationName'],
    },
    {
      name: 'escalation_alert_sms',
      type: NotificationType.ESCALATION_ALERT,
      channel: NotificationChannel.SMS,
      title: 'Care Alert',
      content: `{{caregiverName}}, {{seniorName}} hasn't confirmed taking {{medicationName}}. Please check on them.`,
      variables: ['caregiverName', 'seniorName', 'medicationName'],
    },

    // Voice Templates
    {
      name: 'medication_reminder_voice',
      type: NotificationType.MEDICATION_REMINDER,
      channel: NotificationChannel.VOICE,
      title: 'Medication Reminder Call',
      content: `Hello {{seniorName}}, this is your medication reminder. It's time to take {{medicationName}}, {{dosage}}. Please press 1 to confirm when you've taken it, or press 2 to speak with your caregiver.`,
      variables: ['seniorName', 'medicationName', 'dosage'],
    },
    {
      name: 'missed_dose_alert_voice',
      type: NotificationType.MISSED_DOSE_ALERT,
      channel: NotificationChannel.VOICE,
      title: 'Missed Medication Call',
      content: `Hello {{seniorName}}, you haven't confirmed taking {{medicationName}}. Please take it now and press 1 to confirm, or press 2 to speak with your caregiver.`,
      variables: ['seniorName', 'medicationName'],
    },

    // Push Notification Templates
    {
      name: 'medication_reminder_push',
      type: NotificationType.MEDICATION_REMINDER,
      channel: NotificationChannel.PUSH,
      title: 'Medication Time - {{medicationName}}',
      content: `Time to take {{medicationName}} ({{dosage}}). Tap to confirm.`,
      variables: ['medicationName', 'dosage'],
    },
    {
      name: 'missed_dose_alert_push',
      type: NotificationType.MISSED_DOSE_ALERT,
      channel: NotificationChannel.PUSH,
      title: 'Missed Medication - {{medicationName}}',
      content: `You haven't confirmed taking {{medicationName}}. Please take it now.`,
      variables: ['medicationName'],
    },

    // In-App Templates
    {
      name: 'medication_reminder_in_app',
      type: NotificationType.MEDICATION_REMINDER,
      channel: NotificationChannel.IN_APP,
      title: 'Medication Reminder',
      content: `It's time to take {{medicationName}} ({{dosage}}). Please confirm when you've taken it.`,
      variables: ['medicationName', 'dosage'],
    },
    {
      name: 'confirmation_request_in_app',
      type: NotificationType.CONFIRMATION_REQUEST,
      channel: NotificationChannel.IN_APP,
      title: 'Confirm Medication',
      content: `Did you take {{medicationName}} at {{scheduledTime}}?`,
      variables: ['medicationName', 'scheduledTime'],
    },
  ];

  for (const template of templates) {
    const existingTemplate = await prisma.notificationTemplate.findUnique({
      where: { name: template.name },
    });

    if (existingTemplate) {
      console.log(`Template ${template.name} already exists, skipping...`);
    } else {
      await prisma.notificationTemplate.create({
        data: template,
      });
      console.log(`Created template: ${template.name}`);
    }
  }

  console.log('✅ Notification templates seeded successfully!');
}

async function seedDefaultNotificationSettings() {
  console.log('🌱 Seeding default notification settings...');

  // Get all users
  const users = await prisma.user.findMany();

  for (const user of users) {
    const channels = [
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
      NotificationChannel.PUSH,
      NotificationChannel.IN_APP,
    ];

    for (const channel of channels) {
      const existingSetting = await prisma.notificationSetting.findUnique({
        where: {
          userId_channel: {
            userId: user.id,
            channel,
          },
        },
      });

      if (!existingSetting) {
        await prisma.notificationSetting.create({
          data: {
            userId: user.id,
            channel,
            isEnabled: true,
            timezone: 'UTC',
            maxNotificationsPerDay: channel === NotificationChannel.SMS ? 10 : 50,
          },
        });
        console.log(`Created notification setting for ${user.email} - ${channel}`);
      }
    }
  }

  console.log('✅ Default notification settings seeded successfully!');
}

async function main() {
  try {
    console.log('🚀 Starting notification system seeding...');

    await seedNotificationTemplates();
    await seedDefaultNotificationSettings();

    console.log('✅ Notification system seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during notification seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Notification seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Notification seeding failed:', error);
      process.exit(1);
    });
}

export { main as seedNotificationSystem }; 