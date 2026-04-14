const app = require('./src/app');
const { connectToDb } = require('./src/db');

const port = process.env.PORT || 3000;

const startServer = () => {

  app.listen(port, () => {
    console.log('Server started successfully on http://localhost:' + port);
  });
};

const run = async () => {
  const connected = await connectToDb();
  if (!connected) {
    console.error('Unable to connect to DB. Server will not start until MongoDB is available.');
    process.exit(1);
  }
  startServer();
};

run();