import CV from '../models/CV.js'; // ✅ Correct import
import Log from '../models/Log.js';

export const getStats = async (req, res) => {
  try {
    const stats = await CV.aggregate([
      {
        $project: {
          bulan: {
            $month: {
              $cond: [
                { $ifNull: ["$lastExportExcel", false] }, "$lastExportExcel",
                { $cond: [
                  { $ifNull: ["$lastExportPdf", false] }, "$lastExportPdf",
                  { $cond: [
                    { $ifNull: ["$lastJpgPdf", false] }, "$lastJpgPdf",
                    { $cond: [
                      { $ifNull: ["$lastMerged", false] }, "$lastMerged",
                      "$createdAt" // fallback kalau semua null
                    ]}
                  ]}
                ]}
              ]
            }
          },
          isExcelExported: 1,
          isPdfExported: 1,
          isJpgPdf: 1,
          isMerged: 1
        }
      },
      {
        $group: {
          _id: "$bulan",
          user: { $sum: 1 },
          cvExcel: { $sum: { $cond: [{ $eq: ["$isExcelExported", true] }, 1, 0] } },
          cvPdf: { $sum: { $cond: [{ $eq: ["$isPdfExported", true] }, 1, 0] } },
          jpgPdf: { $sum: { $cond: [{ $eq: ["$isJpgPdf", true] }, 1, 0] } },
          merger: { $sum: { $cond: [{ $eq: ["$isMerged", true] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
        

    const formattedStats = stats.map((s) => ({
      bulan: new Date(2000, s._id - 1).toLocaleString('id-ID', { month: 'short' }),
      user: s.user,
      cvExcel: s.cvExcel,
      cvPdf: s.cvPdf,
      jpgPdf: s.jpgPdf,
      merger: s.merger
    }));
    

    res.json(formattedStats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal ambil data statistik' });
  }
};

export const getLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const total = await Log.countDocuments();
    const logs = await Log.find()
      .sort({ waktu: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const formattedLogs = logs.map(log => ({
      _id: log._id.toString(),
      waktu: log.waktu.toISOString(),  // bisa sesuaikan format sesuai kebutuhan frontend
      aksi: log.aksi,
      user: log.user,
    }));

    res.json({
      logs: formattedLogs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal ambil log aktivitas' });
  }
};
