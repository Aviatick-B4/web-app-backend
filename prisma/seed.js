const { PrismaClient } = require('@prisma/client');
const data = require('./data.json');
const { generateHash } = require('../libs/bcrypt');
const prisma = new PrismaClient();

async function main() {
  await prisma.city.createMany({ data: data.cities });
  await prisma.airport.createMany({ data: data.airports });
  await prisma.airline.createMany({ data: data.airlines });
  await prisma.airplane.createMany({ data: data.airplanes });
  await prisma.airplaneSeatClass.createMany({ data: data.airplaneSeatClass });
  await prisma.flight.createMany({ data: data.flights });
  await prisma.ticket.createMany({ data: data.tickets });
  await prisma.promo.createMany({ data: data.promos });
  for (const user of data.users) {
    await prisma.user.create({
      data: {
        ...user,
        password: await generateHash(user.password),
      },
    });
  }

  await prisma.$executeRaw`SELECT setval('cities_id_seq', (SELECT MAX(id) FROM cities), true)`;
  await prisma.$executeRaw`SELECT setval('airports_id_seq', (SELECT MAX(id) FROM airports), true)`;
  await prisma.$executeRaw`SELECT setval('airlines_id_seq', (SELECT MAX(id) FROM airlines), true)`;
  await prisma.$executeRaw`SELECT setval('airplanes_id_seq', (SELECT MAX(id) FROM airplanes), true)`;
  await prisma.$executeRaw`SELECT setval('flights_id_seq', (SELECT MAX(id) FROM flights), true)`;
  await prisma.$executeRaw`SELECT setval('tickets_id_seq', (SELECT MAX(id) FROM tickets), true)`;
  await prisma.$executeRaw`SELECT setval('promos_id_seq', (SELECT MAX(id) FROM promos), true)`;
  await prisma.$executeRaw`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true)`;

  console.log('Data seeding was successful');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
