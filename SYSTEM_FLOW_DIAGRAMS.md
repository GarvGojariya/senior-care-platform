# Senior Care Platform - System Flow Diagrams

## 1. Complete System Overview Flow

```mermaid
graph TB
    subgraph "User Interface"
        A[Caregiver App] --> B[Create Medication]
        A --> C[Create Schedule]
        D[Senior App] --> E[Receive Notifications]
        D --> F[Confirm Medication]
    end
    
    subgraph "API Layer"
        B --> G[Medication Service]
        C --> H[Schedule Service]
        E --> I[Notification Service]
        F --> J[Confirmation Service]
    end
    
    subgraph "Background Processing"
        K[Schedule Processor] --> L[Check Due Notifications]
        K --> M[Check Missed Doses]
        K --> N[Process Escalations]
    end
    
    subgraph "Notification Channels"
        L --> O[Push Notifications]
        L --> P[Email Service]
        L --> Q[SMS Service]
        L --> R[Voice Service]
        L --> S[Buzzer Service]
        L --> T[In-App Notifications]
    end
    
    subgraph "Database"
        U[(PostgreSQL)]
        V[(Firebase FCM)]
    end
    
    G --> U
    H --> U
    I --> U
    J --> U
    K --> U
    O --> V
    P --> U
    Q --> U
    R --> U
    S --> U
    T --> U
```

## 2. Schedule Creation and Management Flow

```mermaid
sequenceDiagram
    participant C as Caregiver
    participant API as API Gateway
    participant SS as Schedule Service
    participant DB as Database
    participant SP as Schedule Processor
    
    C->>API: Create Schedule Request
    API->>SS: Validate & Process
    SS->>DB: Check Medication Access
    SS->>DB: Validate Dose Times
    SS->>DB: Check for Conflicts
    
    alt Conflicts Found
        SS->>API: Return Error
        API->>C: Schedule Conflict Error
    else No Conflicts
        SS->>DB: Create Schedule Record
        SS->>DB: Calculate Next Notification Time
        DB->>SS: Schedule Created
        SS->>API: Success Response
        API->>C: Schedule Created Successfully
        
        Note over SP: Background Processing
        SP->>DB: Check for Due Notifications
        SP->>DB: Update Notification Status
    end
```

## 3. Notification Processing Flow

```mermaid
graph TD
    A[Cron Job - Every Minute] --> B[Find Active Schedules]
    B --> C{Notification Due?}
    C -->|No| D[Skip - Continue]
    C -->|Yes| E[Get User Settings]
    E --> F[Determine Enabled Channels]
    F --> G[Create Notification Record]
    
    G --> H[Send Push Notification]
    G --> I[Send Email Notification]
    G --> J[Send SMS Notification]
    G --> K[Send Voice Notification]
    G --> L[Send Buzzer Alert]
    G --> M[Create In-App Notification]
    
    H --> N[Update Notification Status]
    I --> N
    J --> N
    K --> N
    L --> N
    M --> N
    
    N --> O[Calculate Next Notification Time]
    O --> P[Update Schedule]
    P --> Q[Log Event]
    
    D --> R[Wait for Next Minute]
    Q --> R
```

## 4. Missed Dose Detection and Escalation Flow

```mermaid
graph TD
    A[Cron Job - Every 30 Minutes] --> B[Find Schedules with Sent Notifications]
    B --> C[Check for Confirmations]
    C --> D{Confirmation Found?}
    
    D -->|Yes| E[Skip - Dose Taken]
    D -->|No| F[Send Missed Dose Alert]
    
    F --> G[Update Notification Status]
    G --> H[Wait for Next Check]
    
    Note over I: Every Hour
    I[Cron Job - Every Hour] --> J[Find Seniors with Missed Doses]
    J --> K[Count Missed Doses per Medication]
    K --> L[Find Active Caregivers]
    L --> M[Send Escalation Alerts]
    M --> N[Log Alert Results]
    N --> O[Wait for Next Hour]
    
    E --> H
    H --> O
```

## 5. Notification Channel Flow

```mermaid
graph LR
    subgraph "Notification Service"
        A[Create Notification] --> B[Get User Settings]
        B --> C[Determine Channels]
    end
    
    subgraph "Push Notifications"
        C --> D[Firebase FCM]
        D --> E[Device Token]
        E --> F[Mobile App]
    end
    
    subgraph "Email Notifications"
        C --> G[Email Service]
        G --> H[SMTP Server]
        H --> I[User Email]
    end
    
    subgraph "SMS Notifications"
        C --> J[SMS Service]
        J --> K[SMS Gateway]
        K --> L[User Phone]
    end
    
    subgraph "Voice Notifications"
        C --> M[Voice Service]
        M --> N[Voice Gateway]
        N --> O[User Phone Call]
    end
    
    subgraph "Buzzer Notifications"
        C --> P[Buzzer Service]
        P --> Q[IoT Device]
        Q --> R[Physical Buzzer]
    end
    
    subgraph "In-App Notifications"
        C --> S[Database Store]
        S --> T[API Endpoint]
        T --> U[Web/Mobile App]
    end
```

## 6. User Confirmation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant API as API Gateway
    participant NS as Notification Service
    participant CS as Confirmation Service
    participant DB as Database
    
    U->>A: Tap "Confirm Medication"
    A->>API: POST /notifications/{id}/confirm
    API->>NS: Confirm Notification
    NS->>DB: Update Notification Status
    NS->>CS: Create Confirmation Record
    CS->>DB: Store Confirmation
    DB->>CS: Confirmation Created
    CS->>NS: Confirmation Success
    NS->>API: Success Response
    API->>A: Confirmation Successful
    A->>U: Show Success Message
```

## 7. Schedule Template Flow

```mermaid
graph TD
    A[Caregiver Selects Template] --> B[Get Template Details]
    B --> C[twice_daily]
    B --> D[three_times_daily]
    B --> E[before_meals]
    B --> F[four_times_daily]
    
    C --> G[08:00, 20:00]
    D --> H[08:00, 14:00, 20:00]
    E --> I[07:30, 12:30, 18:30]
    F --> J[06:00, 12:00, 18:00, 22:00]
    
    G --> K[Apply to Schedule]
    H --> K
    I --> K
    J --> K
    
    K --> L[Validate Times]
    L --> M[Check Conflicts]
    M --> N{Conflicts?}
    N -->|Yes| O[Show Error]
    N -->|No| P[Create Schedule]
    P --> Q[Success]
```

## 8. Error Handling and Retry Flow

```mermaid
graph TD
    A[Send Notification] --> B{Success?}
    B -->|Yes| C[Update Status: SENT]
    B -->|No| D[Increment Retry Count]
    D --> E{Retry Count < Max?}
    E -->|No| F[Update Status: FAILED]
    E -->|Yes| G[Wait Retry Delay]
    G --> H[Retry Notification]
    H --> B
    
    C --> I[Log Success]
    F --> J[Log Failure]
    I --> K[End]
    J --> K
```

## 9. Database Relationships Flow

```mermaid
erDiagram
    User ||--o{ Medication : "has"
    User ||--o{ Schedule : "schedules"
    User ||--o{ Notification : "receives"
    User ||--o{ Confirmation : "confirms"
    User ||--o{ NotificationSetting : "configures"
    User ||--o{ FCMToken : "registers"
    
    Medication ||--o{ Schedule : "scheduled"
    Schedule ||--o{ Notification : "triggers"
    Schedule ||--o{ Confirmation : "confirmed"
    
    Notification ||--o{ NotificationLog : "logs"
    Notification ||--o{ Confirmation : "confirmed"
    
    User ||--o{ CaregiverRelation : "caregiver"
    User ||--o{ CaregiverRelation : "senior"
    
    User {
        string id PK
        string email
        string firstName
        string lastName
        enum role
    }
    
    Medication {
        string id PK
        string userId FK
        string name
        string dosage
        string instructions
    }
    
    Schedule {
        string id PK
        string medicationId FK
        string time
        enum frequency
        enum[] daysOfWeek
        boolean isActive
        int reminderMinutesBefore
        json doseTimes
        datetime nextNotificationDue
        enum notificationStatus
    }
    
    Notification {
        string id PK
        string scheduleId FK
        string userId FK
        enum type
        enum channel
        enum status
        string title
        string message
        datetime scheduledFor
        datetime sentAt
    }
    
    Confirmation {
        string id PK
        string scheduleId FK
        string userId FK
        datetime scheduledTime
        datetime confirmedAt
        enum method
    }
```

## 10. Performance Monitoring Flow

```mermaid
graph TD
    A[System Operations] --> B[Collect Metrics]
    B --> C[Notification Success Rate]
    B --> D[Channel Performance]
    B --> E[Response Times]
    B --> F[Error Rates]
    
    C --> G[Alert if < 95%]
    D --> H[Track per Channel]
    E --> I[Monitor Latency]
    F --> J[Log Errors]
    
    G --> K[Dashboard]
    H --> K
    I --> K
    J --> K
    
    K --> L[Performance Report]
    L --> M[Optimization Actions]
```

## 11. Security and Authentication Flow

```mermaid
graph TD
    A[API Request] --> B{Valid JWT Token?}
    B -->|No| C[Return 401 Unauthorized]
    B -->|Yes| D[Decode Token]
    D --> E{Valid User?}
    E -->|No| F[Return 403 Forbidden]
    E -->|Yes| G{Has Permission?}
    G -->|No| H[Return 403 Forbidden]
    G -->|Yes| I[Process Request]
    
    I --> J[Log Activity]
    J --> K[Return Response]
    
    C --> L[End]
    F --> L
    H --> L
    K --> L
```

## 12. Deployment and Scaling Flow

```mermaid
graph TD
    A[Application Instance] --> B[Load Balancer]
    B --> C[Instance 1]
    B --> D[Instance 2]
    B --> E[Instance N]
    
    C --> F[Database Pool]
    D --> F
    E --> F
    
    F --> G[(Primary DB)]
    F --> H[(Read Replica)]
    
    I[Redis Cache] --> C
    I --> D
    I --> E
    
    J[Message Queue] --> K[Background Workers]
    K --> L[Schedule Processing]
    K --> M[Notification Sending]
    K --> N[Escalation Handling]
```

These flow diagrams provide a comprehensive visual representation of how your scheduling and notification system works, from user interactions to background processing and system architecture.
