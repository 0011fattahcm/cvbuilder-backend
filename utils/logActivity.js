import Log from '../models/Log.js';

const logActivity = async (aksi, userEmail) => {
  try {
    await Log.create({ aksi, user: userEmail });
  } catch (err) {
    console.error('Gagal log aktivitas:', err);
  }
};

export default logActivity;
