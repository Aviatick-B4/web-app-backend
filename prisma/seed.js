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
