// routes/adminLogRoutes.js
import express from 'express';
import adminOnly from '../middleware/authAdminMiddleware.js';
import Log from '../models/Log.js';

const router = express.Router();

// GET logs dengan pagination
router.get('/rx78gpo1p6/logs', adminOnly, async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page) || 1, 1); // minimal halaman 1
      const limit = Math.min(parseInt(req.query.limit) || 50, 100); // maksimal 100 data per page
  
      const total = await Log.countDocuments();
      const logs = await Log.find()
        .sort({ waktu: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
  
      // Mapping agar frontend dapat id dan properti yang jelas
      const formattedLogs = logs.map(log => ({
        _id: log._id.toString(),
        waktu: log.waktu.toISOString(), // atau format lain sesuai kebutuhan
        aksi: log.aksi,
        user: log.user,
      }));
  
      res.json({
        logs: formattedLogs,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error ambil data log:', error);
      res.status(500).json({ message: 'Gagal ambil data log' });
    }
  });

// DELETE banyak log sekaligus berdasarkan array _id
router.delete('/rx78gpo1p6/logs', adminOnly, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid request: ids array required' });
    }

    await Log.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Log berhasil dihapus' });
  } catch (error) {
    console.error('Error hapus log:', error);
    res.status(500).json({ message: 'Gagal hapus log' });
  }
});

export default router;

router.get('/rx78gpo1p6/stats', adminOnly, async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: {
            bulan: { $dateToString: { format: '%Y-%m', date: "$waktu" } },
            aksi: "$aksi"
          },
          total: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.bulan",
          logs: {
            $push: {
              aksi: "$_id.aksi",
              total: "$total"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          bulan: "$_id",
          logs: 1
        }
      },
      {
        $sort: { bulan: 1 }
      }
    ];

    const hasil = await Log.aggregate(pipeline);

    const formatted = hasil.map(item => {
      const result = {
        bulan: item.bulan,
        user: 0,
        cvExcel: 0,
        cvPdf: 0,
        merger: 0,
        jpgPdf: 0,
      };

      item.logs.forEach(log => {
        const aksi = log.aksi.toLowerCase();
      
        if (aksi.includes("registrasi user")) result.user += log.total;
        if (aksi.includes("export cv excel")) result.cvExcel += log.total;
        if (aksi.includes("export cv pdf")) result.cvPdf += log.total;
        if (aksi.includes("merge pdf")) result.merger += log.total;
        if (aksi.includes("convert jpg ke pdf")) result.jpgPdf += log.total;
      });
      

      return result;
    });

    res.json(formatted);
  } catch (err) {
    console.error("Gagal hitung statistik:", err);
    res.status(500).json({ message: 'Gagal hitung statistik' });
  }
});


