import { PrismaClient, Role, Frequency, DaysOfWeek } from 'generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function seedUsers() {
  console.log('🌱 Seeding users...');

  // Create seniors
  const seniors = [
    {
      email: 'john.senior@yopmail.com',
      password: 'senior123',
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1-555-0101',
      emergencyContact: '+1-555-0102',
      role: Role.SENIOR,
    },
    {
      email: 'mary.senior@yopmail.com',
      password: 'senior123',
      firstName: 'Mary',
      lastName: 'Johnson',
      phone: '+1-555-0103',
      emergencyContact: '+1-555-0104',
      role: Role.SENIOR,
    },
    {
      email: 'robert.senior@yopmail.com',
      password: 'senior123',
      firstName: 'Robert',
      lastName: 'Williams',
      phone: '+1-555-0105',
      emergencyContact: '+1-555-0106',
      role: Role.SENIOR,
    },
  ];

  // Create caregivers
  const caregivers = [
    {
      email: 'sarah.caregiver@yopmail.com',
      password: 'caregiver123',
      firstName: 'Sarah',
      lastName: 'Davis',
      phone: '+1-555-0201',
      emergencyContact: '+1-555-0202',
      role: Role.CAREGIVER,
    },
    {
      email: 'michael.caregiver@yopmail.com',
      password: 'caregiver123',
      firstName: 'Michael',
      lastName: 'Brown',
      phone: '+1-555-0203',
      emergencyContact: '+1-555-0204',
      role: Role.CAREGIVER,
    },
    {
      email: 'lisa.caregiver@yopmail.com',
      password: 'caregiver123',
      firstName: 'Lisa',
      lastName: 'Wilson',
      phone: '+1-555-0205',
      emergencyContact: '+1-555-0206',
      role: Role.CAREGIVER,
    },
  ];

  // Create admin user
  const admin = {
    email: 'admin@yopmail.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+1-555-0001',
    emergencyContact: '+1-555-0002',
    role: Role.ADMIN,
  };

  const allUsers = [...seniors, ...caregivers, admin];
  const createdUsers: any[] = [];

  for (const userData of allUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`User ${userData.email} already exists, skipping...`);
      createdUsers.push(existingUser);
    } else {
      const hashedPassword = await hashPassword(userData.password);
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          emergencyContact: userData.emergencyContact,
          role: userData.role,
        },
      });
      createdUsers.push(user);
      console.log(`Created user: ${user.email} (${user.role})`);
    }
  }

  return {
    seniors: createdUsers.filter(user => user.role === Role.SENIOR),
    caregivers: createdUsers.filter(user => user.role === Role.CAREGIVER),
    admin: createdUsers.find(user => user.role === Role.ADMIN),
  };
}

async function seedCaregiverRelations(seniors: any[], caregivers: any[]) {
  console.log('🌱 Seeding caregiver relations...');

  const relations = [
    {
      caregiver: caregivers[0], // Sarah Davis
      senior: seniors[0], // John Smith
      relationship: 'family',
    },
    {
      caregiver: caregivers[0], // Sarah Davis
      senior: seniors[1], // Mary Johnson
      relationship: 'professional',
    },
    {
      caregiver: caregivers[1], // Michael Brown
      senior: seniors[0], // John Smith
      relationship: 'family',
    },
    {
      caregiver: caregivers[2], // Lisa Wilson
      senior: seniors[2], // Robert Williams
      relationship: 'professional',
    },
  ];

  for (const relation of relations) {
    const existingRelation = await prisma.caregiverRelation.findUnique({
      where: {
        caregiverId_seniorId: {
          caregiverId: relation.caregiver.id,
          seniorId: relation.senior.id,
        },
      },
    });

    if (!existingRelation) {
      await prisma.caregiverRelation.create({
        data: {
          caregiverId: relation.caregiver.id,
          seniorId: relation.senior.id,
          relationship: relation.relationship,
        },
      });
      console.log(`Created relation: ${relation.caregiver.firstName} ${relation.caregiver.lastName} -> ${relation.senior.firstName} ${relation.senior.lastName} (${relation.relationship})`);
    } else {
      console.log(`Relation already exists: ${relation.caregiver.firstName} ${relation.caregiver.lastName} -> ${relation.senior.firstName} ${relation.senior.lastName}`);
    }
  }
}

async function seedMedications(seniors: any[], caregivers: any[]) {
  console.log('🌱 Seeding medications...');

  const medications = [
    {
      name: 'Lisinopril',
      dosage: '10mg',
      instructions: 'Take once daily in the morning with or without food',
      senior: seniors[0], // John Smith
      createdBy: caregivers[0].id, // Sarah Davis
    },
    {
      name: 'Metformin',
      dosage: '500mg',
      instructions: 'Take twice daily with meals to reduce stomach upset',
      senior: seniors[0], // John Smith
      createdBy: caregivers[0].id, // Sarah Davis
    },
    {
      name: 'Atorvastatin',
      dosage: '20mg',
      instructions: 'Take once daily in the evening',
      senior: seniors[0], // John Smith
      createdBy: caregivers[0].id, // Sarah Davis
    },
    {
      name: 'Aspirin',
      dosage: '81mg',
      instructions: 'Take once daily in the morning with food',
      senior: seniors[1], // Mary Johnson
      createdBy: caregivers[0].id, // Sarah Davis
    },
    {
      name: 'Vitamin D3',
      dosage: '1000 IU',
      instructions: 'Take once daily with breakfast',
      senior: seniors[1], // Mary Johnson
      createdBy: caregivers[0].id, // Sarah Davis
    },
    {
      name: 'Warfarin',
      dosage: '5mg',
      instructions: 'Take once daily at the same time each day',
      senior: seniors[2], // Robert Williams
      createdBy: caregivers[2].id, // Lisa Wilson
    },
    {
      name: 'Furosemide',
      dosage: '40mg',
      instructions: 'Take once daily in the morning',
      senior: seniors[2], // Robert Williams
      createdBy: caregivers[2].id, // Lisa Wilson
    },
  ];

  const createdMedications: any[] = [];

  for (const medData of medications) {
    const medication = await prisma.medication.create({
      data: {
        userId: medData.senior.id,
        name: medData.name,
        dosage: medData.dosage,
        instructions: medData.instructions,
        createdBy: medData.createdBy,
        isActive: true,
      },
    });
    createdMedications.push(medication);
    console.log(`Created medication: ${medication.name} for ${medData.senior.firstName} ${medData.senior.lastName}`);
  }

  return createdMedications;
}

async function seedSchedules(medications: any[]) {
  console.log('🌱 Seeding schedules...');

  const schedules = [
    {
      medication: medications[0], // Lisinopril
      frequency: Frequency.ONCE,
      doseTimes: [
        { time: '08:00', label: 'morning', instructions: 'Take with breakfast' },
      ],
      daysOfWeek: [DaysOfWeek.MONDAY, DaysOfWeek.TUESDAY, DaysOfWeek.WEDNESDAY, DaysOfWeek.THURSDAY, DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
      description: 'Daily blood pressure medication',
      reminderType: 'notification',
      reminderMinutesBefore: 15,
    },
    {
      medication: medications[1], // Metformin
      frequency: Frequency.TWICE,
      doseTimes: [
        { time: '08:00', label: 'morning', instructions: 'Take with breakfast' },
        { time: '18:00', label: 'evening', instructions: 'Take with dinner' },
      ],
      daysOfWeek: [DaysOfWeek.MONDAY, DaysOfWeek.TUESDAY, DaysOfWeek.WEDNESDAY, DaysOfWeek.THURSDAY, DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
      description: 'Diabetes medication - twice daily',
      reminderType: 'sms',
      reminderMinutesBefore: 30,
    },
    {
      medication: medications[2], // Atorvastatin
      frequency: Frequency.ONCE,
      doseTimes: [
        { time: '20:00', label: 'evening', instructions: 'Take before bedtime' },
      ],
      daysOfWeek: [DaysOfWeek.MONDAY, DaysOfWeek.TUESDAY, DaysOfWeek.WEDNESDAY, DaysOfWeek.THURSDAY, DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
      description: 'Cholesterol medication - evening dose',
      reminderType: 'voice',
      reminderMinutesBefore: 20,
    },
    {
      medication: medications[3], // Aspirin
      frequency: Frequency.ONCE,
      doseTimes: [
        { time: '07:00', label: 'morning', instructions: 'Take with breakfast' },
      ],
      daysOfWeek: [DaysOfWeek.MONDAY, DaysOfWeek.TUESDAY, DaysOfWeek.WEDNESDAY, DaysOfWeek.THURSDAY, DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
      description: 'Daily aspirin for heart health',
      reminderType: 'notification',
      reminderMinutesBefore: 10,
    },
    {
      medication: medications[4], // Vitamin D3
      frequency: Frequency.ONCE,
      doseTimes: [
        { time: '08:30', label: 'morning', instructions: 'Take with breakfast' },
      ],
      daysOfWeek: [DaysOfWeek.MONDAY, DaysOfWeek.TUESDAY, DaysOfWeek.WEDNESDAY, DaysOfWeek.THURSDAY, DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
      description: 'Daily vitamin supplement',
      reminderType: 'notification',
      reminderMinutesBefore: 15,
    },
    {
      medication: medications[5], // Warfarin
      frequency: Frequency.ONCE,
      doseTimes: [
        { time: '19:00', label: 'evening', instructions: 'Take at the same time daily' },
      ],
      daysOfWeek: [DaysOfWeek.MONDAY, DaysOfWeek.TUESDAY, DaysOfWeek.WEDNESDAY, DaysOfWeek.THURSDAY, DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
      description: 'Blood thinner - consistent timing important',
      reminderType: 'buzzer',
      reminderMinutesBefore: 15,
    },
    {
      medication: medications[6], // Furosemide
      frequency: Frequency.ONCE,
      doseTimes: [
        { time: '09:00', label: 'morning', instructions: 'Take in the morning to avoid nighttime bathroom trips' },
      ],
      daysOfWeek: [DaysOfWeek.MONDAY, DaysOfWeek.TUESDAY, DaysOfWeek.WEDNESDAY, DaysOfWeek.THURSDAY, DaysOfWeek.FRIDAY, DaysOfWeek.SATURDAY, DaysOfWeek.SUNDAY],
      description: 'Diuretic medication',
      reminderType: 'sms',
      reminderMinutesBefore: 25,
    },
  ];

  for (const scheduleData of schedules) {
    const schedule = await prisma.schedule.create({
      data: {
        medicationId: scheduleData.medication.id,
        time: scheduleData.doseTimes[0].time, // Legacy field
        frequency: scheduleData.frequency,
        daysOfWeek: scheduleData.daysOfWeek,
        description: scheduleData.description,
        isActive: true,
        reminderType: scheduleData.reminderType,
        reminderMinutesBefore: scheduleData.reminderMinutesBefore,
        doseTimes: scheduleData.doseTimes,
      },
    });
    console.log(`Created schedule: ${scheduleData.medication.name} - ${scheduleData.frequency} daily`);
  }
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...');

    // Seed users
    const { seniors, caregivers, admin } = await seedUsers();

    // Seed caregiver relations
    await seedCaregiverRelations(seniors, caregivers);

    // Seed medications
    const medications = await seedMedications(seniors, caregivers);

    // Seed schedules
    await seedSchedules(medications);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${seniors.length} seniors created`);
    console.log(`- ${caregivers.length} caregivers created`);
    console.log(`- 1 admin user created`);
    console.log(`- ${medications.length} medications created`);
    console.log(`- 7 schedules created`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { main as seedDatabase }; 