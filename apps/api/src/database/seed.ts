import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_CONCERTS = [
  {
    name: 'The Nights Concert',
    description:
      'An open-air night of indie and pop from the bands that defined the last decade. Gates open at 6pm.',
    totalSeats: 500,
  },
  {
    name: 'Bangkok Symphony Gala',
    description:
      'A full orchestral programme of film scores and classical favourites at the Thailand Cultural Centre.',
    totalSeats: 120,
  },
  {
    name: 'Rooftop Jazz Session',
    description:
      'An intimate late-night jazz set on the rooftop, limited seating and a live quartet. Small room on purpose.',
    totalSeats: 3,
  },
];

async function main(): Promise<void> {
  const admin = await prisma.user.upsert({
    where: { email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@datawow.io').toLowerCase() },
    update: {},
    create: {
      email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@datawow.io').toLowerCase(),
      name: 'Admin',
      passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234', 10),
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: (process.env.SEED_USER_EMAIL ?? 'user@datawow.io').toLowerCase() },
    update: {},
    create: {
      email: (process.env.SEED_USER_EMAIL ?? 'user@datawow.io').toLowerCase(),
      name: 'Demo User',
      passwordHash: await bcrypt.hash(process.env.SEED_USER_PASSWORD ?? 'User@1234', 10),
      role: Role.USER,
    },
  });

  const existing = await prisma.concert.count();
  if (existing === 0) {
    await prisma.concert.createMany({
      data: DEMO_CONCERTS.map((concert) => ({ ...concert, createdById: admin.id })),
    });
  }

  console.log(`Seed complete. ${existing === 0 ? DEMO_CONCERTS.length : 0} concerts created.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
