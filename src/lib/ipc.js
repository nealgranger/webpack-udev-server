import client from 'socket.io-client';

const start = () => {
  if (process.env.IPC_URL) {
    const io = client(`${process.env.IPC_URL}${process.env.IPC_SOCKET_NS}`);
    return io;
  }
  throw new Error('No IPC_URL defined!');
};

export default start();
