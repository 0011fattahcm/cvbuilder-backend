import Announcement from "../models/Announcement.js";

export const getActiveAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!announcement) return res.json({ message: "" });
    res.json({ message: announcement.message });
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil pengumuman" });
  }
};

// Ambil semua pengumuman
export const getAllAnnouncements = async (req, res) => {
    const data = await Announcement.find().sort({ createdAt: -1 });
    res.json(data);
  };
  
  // Tambah pengumuman
  export const createAnnouncement = async (req, res) => {
    const { message } = req.body;
    const newData = new Announcement({ message });
    await newData.save();
    res.status(201).json({ message: "Pengumuman ditambahkan." });
  };
  
  // Edit
  export const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    await Announcement.findByIdAndUpdate(id, { message });
    res.json({ message: "Pengumuman diperbarui." });
  };
  
  // Hapus
  export const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ message: "Pengumuman dihapus." });
  };
  
  // Aktifkan hanya satu pengumuman
  export const setActiveAnnouncement = async (req, res) => {
    const { id } = req.params;
    await Announcement.updateMany({}, { isActive: false }); // matikan semua
    await Announcement.findByIdAndUpdate(id, { isActive: true });
    res.json({ message: "Pengumuman diaktifkan." });
  };
  
  export const deactivateAllAnnouncements = async (req, res) => {
    await Announcement.updateMany({}, { isActive: false });
    res.json({ message: "Semua pengumuman dinonaktifkan." });
  };
  