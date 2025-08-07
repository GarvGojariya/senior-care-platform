# Senior Care Platform - Scheduling & Notifications System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Scheduling System](#scheduling-system)
5. [Notification System](#notification-system)
6. [System Flow](#system-flow)
7. [API Endpoints](#api-endpoints)
8. [Configuration](#configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

## System Overview

The Senior Care Platform implements a comprehensive medication scheduling and notification system designed to ensure seniors take their medications on time. The system features:

- **Flexible Scheduling**: Support for multiple dose times per day, custom frequencies, and day-of-week patterns
- **Multi-Channel Notifications**: Push notifications, email, SMS, voice calls, and in-app notifications
- **Escalation System**: Automatic alerts to caregivers when doses are missed
- **Confirmation Tracking**: Record when medications are taken
- **Real-time Processing**: Cron-based background processing for timely notifications

## Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Schedules     │    │  Notifications   │    │   Schedule      │
│   Service       │    │   Service        │    │   Processor     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Prisma        │    │   Push           │    │   Email         │
│   Service       │    │   Notification   │    │   Service       │
│                 │    │   Service        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                      │
└─────────────────────────────────────────────────────────────────┘
```

### Key Services

1. **SchedulesService**: Manages medication schedules, CRUD operations, conflict detection
2. **NotificationService**: Handles notification creation, sending, and tracking
3. **ScheduleProcessorService**: Background processing for notifications and missed doses
4. **PushNotificationService**: Firebase Cloud Messaging integration
5. **EmailService**: Email notification delivery

## Database Schema

### Core Tables

#### Schedule
```sql
- id: String (Primary Key)
- medicationId: String (Foreign Key)
- time: String (HH:MM format - legacy)
- frequency: Frequency enum
- daysOfWeek: DaysOfWeek[] array
- isActive: Boolean
- reminderType: String?
- reminderMinutesBefore: Int? (default: 15)
- doseTimes: Json? (Array of dose times with labels)
- lastNotificationSent: DateTime?
- nextNotificationDue: DateTime?
- notificationStatus: NotificationStatus enum
```

#### Notification
```sql
- id: String (Primary Key)
- scheduleId: String (Foreign Key)
- userId: String (Foreign Key)
- type: NotificationType enum
- channel: NotificationChannel enum
- status: NotificationStatus enum
- title: String
- message: String
- scheduledFor: DateTime
- sentAt: DateTime?
- deliveredAt: DateTime?
- readAt: DateTime?
- confirmedAt: DateTime?
- retryCount: Int
- maxRetries: Int
- errorMessage: String?
- metadata: Json?
```

#### Confirmation
```sql
- id: String (Primary Key)
- scheduleId: String (Foreign Key)
- userId: String (Foreign Key)
- scheduledTime: DateTime
- confirmedAt: DateTime?
- method: ConfirmationMethod enum
- notes: String?
- notificationId: String? (Foreign Key)
```

### Enums

#### NotificationType
- `MEDICATION_REMINDER`
- `MISSED_DOSE_ALERT`
- `CONFIRMATION_REQUEST`
- `ESCALATION_ALERT`
- `SYSTEM_NOTIFICATION`

#### NotificationChannel
- `EMAIL`
- `SMS`
- `VOICE`
- `BUZZER`
- `PUSH`
- `IN_APP`

#### NotificationStatus
- `PENDING`
- `SENT`
- `DELIVERED`
- `READ`
- `CONFIRMED`
- `FAILED`
- `CANCELLED`

## Scheduling System

### Schedule Creation Flow

```mermaid
graph TD
    A[Caregiver Creates Schedule] --> B[Validate Medication Access]
    B --> C[Validate Dose Times Format]
    C --> D[Check for Schedule Conflicts]
    D --> E[Create Schedule Record]
    E --> F[Calculate Next Notification Time]
    F --> G[Return Schedule with Medication Details]
```

### Schedule Templates

The system provides predefined schedule templates:

1. **twice_daily**: Morning (08:00) and evening (20:00)
2. **three_times_daily**: Morning (08:00), afternoon (14:00), evening (20:00)
3. **before_meals**: Before breakfast (07:30), lunch (12:30), dinner (18:30)
4. **four_times_daily**: Early morning (06:00), noon (12:00), evening (18:00), night (22:00)

### Conflict Detection

The system prevents overlapping schedules by:
- Checking for existing schedules on the same days
- Validating dose times don't conflict
- Ensuring only one medication per time slot per user

## Notification System

### Notification Channels

#### 1. Push Notifications (Firebase Cloud Messaging)
- **Implementation**: Firebase Admin SDK
- **Features**: High priority, sound alerts, click actions
- **Payload**: Medication name, dosage, scheduled time, action buttons

#### 2. Email Notifications
- **Implementation**: Email service integration
- **Features**: HTML templates, medication details, confirmation links
- **Content**: Personalized messages with medication information

#### 3. SMS Notifications (Planned)
- **Status**: Not yet implemented
- **Use Case**: Emergency alerts and missed dose notifications

#### 4. Voice Notifications (Planned)
- **Status**: Not yet implemented
- **Use Case**: Accessibility for seniors with visual impairments

#### 5. Buzzer Notifications (Planned)
- **Status**: Not yet implemented
- **Use Case**: Physical device alerts for immediate attention

#### 6. In-App Notifications
- **Implementation**: Database-stored notifications
- **Features**: Real-time updates, confirmation tracking
- **Access**: API endpoints for mobile/web apps

### Notification Settings

Users can configure:
- **Channel Preferences**: Enable/disable specific channels
- **Quiet Hours**: Set time ranges when notifications are muted
- **Frequency Limits**: Maximum notifications per day
- **Timezone**: Local time zone for accurate scheduling

## System Flow

### 1. Medication Reminder Flow

```mermaid
graph TD
    A[Cron Job - Every Minute] --> B[Find Active Schedules]
    B --> C[Check if Notification Due]
    C --> D[Get User Settings]
    D --> E[Determine Enabled Channels]
    E --> F[Create Notification Record]
    F --> G[Send to Each Channel]
    G --> H[Update Notification Status]
    H --> I[Calculate Next Notification Time]
    I --> J[Update Schedule]
```

### 2. Missed Dose Detection Flow

```mermaid
graph TD
    A[Cron Job - Every 30 Minutes] --> B[Find Schedules with Sent Notifications]
    B --> C[Check for Confirmations]
    C --> D{Confirmation Found?}
    D -->|No| E[Send Missed Dose Alert]
    D -->|Yes| F[Skip - Dose Taken]
    E --> G[Update Notification Status]
```

### 3. Escalation Alert Flow

```mermaid
graph TD
    A[Cron Job - Every Hour] --> B[Find Seniors with Missed Doses]
    B --> C[Count Missed Doses per Medication]
    C --> D[Find Active Caregivers]
    D --> E[Send Escalation Alerts]
    E --> F[Log Alert Results]
```

### 4. Notification Confirmation Flow

```mermaid
graph TD
    A[User Confirms Notification] --> B[Update Notification Status]
    B --> C[Create Confirmation Record]
    C --> D[Update Schedule Status]
    D --> E[Log Confirmation Event]
```

## API Endpoints

### Schedule Management

#### Create Schedule
```http
POST /schedules
Content-Type: application/json

{
  "medicationId": "med_123",
  "frequency": "TWICE",
  "daysOfWeek": ["MONDAY", "TUESDAY", "WEDNESDAY"],
  "doseTimes": [
    {"time": "08:00", "label": "morning"},
    {"time": "20:00", "label": "evening"}
  ],
  "reminderMinutesBefore": 15
}
```

#### Get Schedules
```http
GET /schedules?medicationId=med_123&date=2024-01-15
```

#### Update Schedule
```http
PUT /schedules/{id}
Content-Type: application/json

{
  "isActive": false,
  "reminderMinutesBefore": 30
}
```

### Notification Management

#### Get User Notifications
```http
GET /notifications?limit=50&offset=0
```

#### Confirm Notification
```http
POST /notifications/{id}/confirm
```

#### Get Notification Statistics
```http
GET /notifications/stats
```

### Schedule Templates

#### Get Available Templates
```http
GET /schedules/templates
```

#### Create Schedule from Template
```http
POST /schedules/from-template
Content-Type: application/json

{
  "templateName": "twice_daily",
  "medicationId": "med_123",
  "daysOfWeek": ["MONDAY", "TUESDAY", "WEDNESDAY"]
}
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/senior_care"

# Firebase (Push Notifications)
FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", ...}'
FIREBASE_PROJECT_ID="your-project-id"

# Email Service
EMAIL_SERVICE_API_KEY="your-email-service-key"
EMAIL_FROM_ADDRESS="noreply@seniorcare.com"

# Application
NODE_ENV="production"
PORT=3000
```

### Cron Job Configuration

The system uses NestJS scheduling with the following cron patterns:

```typescript
// Process medication schedules every minute
@Cron(CronExpression.EVERY_MINUTE)
async processMedicationSchedules()

// Check for missed doses every 30 minutes
@Cron('0 */30 * * * *')
async checkForMissedDoses()

// Process escalation alerts every hour
@Cron(CronExpression.EVERY_HOUR)
async processEscalationAlerts()
```

## Monitoring & Logging

### Log Levels

- **INFO**: Normal operations, successful notifications
- **WARN**: Non-critical issues (disabled channels, missing tokens)
- **ERROR**: Failed notifications, system errors
- **DEBUG**: Detailed processing information

### Key Metrics

1. **Notification Success Rate**: Percentage of successfully sent notifications
2. **Channel Performance**: Success rates per notification channel
3. **Missed Dose Rate**: Percentage of doses not confirmed
4. **Escalation Frequency**: Number of escalation alerts sent
5. **Response Time**: Time from scheduled time to confirmation

### Monitoring Endpoints

```http
GET /health/notifications
GET /metrics/notification-stats
GET /metrics/schedule-stats
```

## Troubleshooting

### Common Issues

#### 1. Notifications Not Sending

**Symptoms**: No notifications received by users
**Causes**:
- Firebase configuration issues
- Invalid FCM tokens
- User notification settings disabled
- Database connection problems

**Solutions**:
- Check Firebase service account configuration
- Verify FCM token registration
- Review user notification settings
- Check database connectivity

#### 2. Schedule Conflicts

**Symptoms**: Error when creating schedules
**Causes**:
- Overlapping dose times
- Same medication scheduled multiple times
**Solutions**:
- Review existing schedules
- Adjust dose times
- Use different medications

#### 3. Missed Dose Alerts Not Triggering

**Symptoms**: No escalation alerts for missed doses
**Causes**:
- Cron jobs not running
- Incorrect time calculations
- Database query issues
**Solutions**:
- Check cron job logs
- Verify timezone settings
- Review database queries

### Debug Commands

```bash
# Manually trigger schedule processing
curl -X POST /schedules/process

# Manually trigger missed dose check
curl -X POST /schedules/check-missed-doses

# Manually trigger escalation processing
curl -X POST /schedules/process-escalations
```

### Log Analysis

```bash
# View notification logs
grep "NotificationService" /var/log/app.log

# View schedule processing logs
grep "ScheduleProcessorService" /var/log/app.log

# View error logs
grep "ERROR" /var/log/app.log
```

## Performance Considerations

### Database Optimization

1. **Indexes**: Proper indexing on frequently queried fields
2. **Query Optimization**: Efficient queries for schedule processing
3. **Connection Pooling**: Optimized database connections

### Notification Batching

1. **Batch Processing**: Group notifications by user/channel
2. **Rate Limiting**: Prevent notification spam
3. **Retry Logic**: Automatic retry for failed notifications

### Scalability

1. **Horizontal Scaling**: Multiple application instances
2. **Queue System**: Background job processing
3. **Caching**: Redis for frequently accessed data

## Security Considerations

1. **Authentication**: JWT-based authentication for all endpoints
2. **Authorization**: Role-based access control
3. **Data Privacy**: Encrypted sensitive information
4. **Audit Logging**: Track all notification activities
5. **Rate Limiting**: Prevent abuse of notification endpoints

## Future Enhancements

1. **AI-Powered Scheduling**: Machine learning for optimal dose times
2. **Voice Integration**: Voice-activated medication confirmation
3. **IoT Integration**: Smart pill dispensers and sensors
4. **Advanced Analytics**: Predictive analytics for medication adherence
5. **Multi-language Support**: Internationalization for diverse users
