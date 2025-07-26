import { Server } from '@/presentation/server';
import { envs } from '@/config';  

async function main() {
  const server = new Server(envs.PORT);
  await server.start();
}

main();