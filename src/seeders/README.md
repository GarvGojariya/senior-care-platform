# Database Seeder

This seeder populates the database with sample data for testing and development purposes.

## What it creates

### Users
- **3 Seniors:**
  - John Smith (john.senior@yopmail.com)
  - Mary Johnson (mary.senior@yopmail.com)
  - Robert Williams (robert.senior@yopmail.com)

- **3 Caregivers:**
  - Sarah Davis (sarah.caregiver@yopmail.com)
  - Michael Brown (michael.caregiver@yopmail.com)
  - Lisa Wilson (lisa.caregiver@yopmail.com)

- **1 Admin:**
  - Admin User (admin@yopmail.com)

### Caregiver Relations
- Sarah Davis → John Smith (family)
- Sarah Davis → Mary Johnson (professional)
- Michael Brown → John Smith (family)
- Lisa Wilson → Robert Williams (professional)

### Medications
- **John Smith's medications:**
  - Lisinopril (10mg) - Blood pressure medication
  - Metformin (500mg) - Diabetes medication
  - Atorvastatin (20mg) - Cholesterol medication

- **Mary Johnson's medications:**
  - Aspirin (81mg) - Heart health
  - Vitamin D3 (1000 IU) - Vitamin supplement

- **Robert Williams' medications:**
  - Warfarin (5mg) - Blood thinner
  - Furosemide (40mg) - Diuretic

### Schedules
Each medication has a corresponding schedule with:
- Appropriate frequency (once/twice daily)
- Specific times and instructions
- Different reminder types (notification, SMS, voice, buzzer)
- Daily schedules (Monday through Sunday)

## How to run

### Using npm/yarn script
```bash
yarn seed
# or
npm run seed
```

### Direct execution
```bash
npx ts-node -r tsconfig-paths/register src/seeders/run-seeder.ts
```

## Default Passwords

All users are created with simple passwords for development:
- **Seniors:** `senior123`
- **Caregivers:** `caregiver123`
- **Admin:** `admin123`

## Features

- **Idempotent:** Can be run multiple times safely
- **Duplicate prevention:** Checks for existing users before creating new ones
- **Comprehensive logging:** Shows what's being created
- **Error handling:** Graceful error handling and cleanup

## Notes

- All email addresses use the `@yopmail.com` domain as requested
- Passwords are properly hashed using bcryptjs
- Schedules include various reminder types to test different notification methods
- The seeder creates realistic medication scenarios with proper dosages and instructions 