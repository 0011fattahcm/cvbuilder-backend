import mongoose from 'mongoose';

const pendidikanSchema = new mongoose.Schema({
  nama: String,
  jurusan: String,
  masa: String
});

const pekerjaanSchema = new mongoose.Schema({
  namaPerusahaan: String,
  rincianKerja: String,
  masaKerja: String
});

const keluargaSchema = new mongoose.Schema({
  urutan: String,
  nama: String,
  pekerjaan: String,
  usia: Number
});

const riwayatJepangSchema = new mongoose.Schema({
  pernah: String,
  ijinTinggal: String,
  lamaTinggal: String,
  perusahaanPenerima: String,
  lokasi: String
});

const cvSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foto: String,
  nama: String,
  namaKatakana: String,
  panggilan: String,
  panggilanKatakana: String,
  tanggalLahir: Date,
  usia: Number,
  jenisKelamin: String,
  tempatLahir: String,
  email: String,
  telp: String,
  alamatLengkap: String,
  tinggiBadan: Number,
  beratBadan: Number,
  statusPernikahan: String,
  agama: String,
  golonganDarah: String,
  alkohol: String,
  merokok: String,
  butaWarna: String,
  levelBahasa: String,
  sswDimiliki: String,
  nomorPaspor: String,
  masaBerlakuPaspor: String,
  promosiDiri: String,
  pendidikan: [pendidikanSchema],
  pekerjaan: [pekerjaanSchema],
  keluarga: [keluargaSchema],
  riwayatJepang: [riwayatJepangSchema],
  // ✅ Tambahkan field di sini
  isExcelExported: { type: Boolean, default: false },
  isPdfExported: { type: Boolean, default: false },
  isJpgPdf: { type: Boolean, default: false },
  isMerged: { type: Boolean, default: false },

  lastExportExcel: Date,
  lastExportPdf: Date,
  lastJpgPdf: Date,
  lastMerged: Date,

}, { timestamps: true });

const CV = mongoose.model('CV', cvSchema);
export default CV;
