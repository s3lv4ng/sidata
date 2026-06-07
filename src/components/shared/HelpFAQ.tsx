'use client'

import { useState } from 'react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import {
  HelpCircle,
  Search,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  MessageCircle,
  BookOpen,
  Users,
  Shield,
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  icon: React.ElementType
  items: FAQItem[]
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    title: 'Umum',
    icon: BookOpen,
    items: [
      {
        question: 'Apa itu SIDATA BKAD?',
        answer: 'SIDATA (Sistem Informasi Data ASN) BKAD adalah aplikasi web yang digunakan oleh Badan Keuangan dan Aset Daerah Kabupaten Seruyan untuk mengumpulkan dan mengelola data Aparatur Sipil Negara (ASN). Sistem ini memudahkan proses pengisian formulir, pelaporan, dan pengelolaan data pegawai secara digital.',
      },
      {
        question: 'Bagaimana cara login ke SIDATA?',
        answer: 'Untuk login ke SIDATA, gunakan NIP (Nomor Induk Pegawai) sebagai username dan password yang telah diberikan oleh administrator. Jika Anda lupa password, silakan hubungi administrator BKAD melalui kontak yang tersedia di bawah halaman ini.',
      },
      {
        question: 'Apakah SIDATA bisa diakses melalui HP?',
        answer: 'Ya, SIDATA dirancang responsif dan dapat diakses melalui perangkat mobile (smartphone) maupun komputer. Tampilan akan menyesuaikan ukuran layar perangkat Anda secara otomatis.',
      },
      {
        question: 'Apakah data saya aman di SIDATA?',
        answer: 'SIDATA menggunakan sistem keamanan yang melindungi data Anda. Setiap pengguna hanya dapat mengakses data sesuai dengan perannya. Data disimpan secara lokal di server pemerintah dan tidak dibagikan ke pihak ketiga.',
      },
      {
        question: 'Apa perbedaan role Admin dan ASN?',
        answer: 'Admin memiliki akses penuh untuk mengelola formulir, data ASN, melihat laporan, dan mengatur sistem. ASN (Aparatur Sipil Negara) hanya dapat melihat dan mengisi formulir yang ditugaskan kepadanya, serta mengunduh bukti pengisian.',
      },
    ],
  },
  {
    title: 'Untuk ASN',
    icon: Users,
    items: [
      {
        question: 'Bagaimana cara mengisi formulir?',
        answer: 'Setelah login, Anda akan melihat daftar formulir yang aktif di halaman beranda. Klik tombol "Isi Form" pada formulir yang ingin Anda isi. Isi setiap pertanyaan sesuai dengan jenis field (isian singkat, paragraf, pilihan ganda, dll). Klik "Kirim" setelah selesai mengisi semua pertanyaan yang wajib.',
      },
      {
        question: 'Apakah saya bisa mengubah jawaban yang sudah dikirim?',
        answer: 'Ya, selama formulir masih aktif dan belum melewati deadline, Anda dapat mengubah jawaban dengan mengklik tombol "Lihat / Ubah" pada formulir yang sudah diisi. Setelah selesai mengubah, klik "Kirim" untuk menyimpan perubahan.',
      },
      {
        question: 'Bagaimana cara mengunduh bukti pengisian?',
        answer: 'Pada formulir yang sudah Anda isi, klik tombol "Unduh Bukti". Sistem akan menghasilkan file PDF berisi bukti pengisian yang mencakup data diri Anda, tanggal pengisian, dan ringkasan jawaban. File ini dapat digunakan sebagai dokumen resmi.',
      },
      {
        question: 'Bagaimana cara mengubah password?',
        answer: 'Klik tombol "Ubah Password" di header halaman. Masukkan password lama, kemudian buat password baru (minimal 6 karakter). Password baru akan langsung berlaku setelah berhasil diubah.',
      },
      {
        question: 'Apa arti status formulir (Belum Diisi, Sudah Diisi, Ditutup)?',
        answer: '"Belum Diisi" berarti formulir masih aktif dan Anda belum mengisinya. "Sudah Diisi" berarti Anda telah mengirimkan jawaban untuk formulir tersebut. "Ditutup" berarti formulir sudah melewati deadline dan tidak dapat diisi lagi.',
      },
      {
        question: 'Bagaimana jika saya lupa password?',
        answer: 'Jika Anda lupa password, hubungi administrator BKAD melalui kontak yang tersedia di bagian bawah halaman ini. Administrator akan membantu mereset password Anda.',
      },
      {
        question: 'Bagaimana cara mengubah profil (email, no HP)?',
        answer: 'Klik tab "Profil" di navigasi bawah (mobile) atau buka halaman profil. Kemudian klik tombol "Edit Profil" untuk mengubah Email dan No HP. Data lainnya seperti Nama, NIP, dan Jabatan hanya dapat diubah oleh administrator.',
      },
    ],
  },
  {
    title: 'Untuk Admin',
    icon: Shield,
    items: [
      {
        question: 'Bagaimana cara membuat formulir baru?',
        answer: 'Buka menu "Manajemen Form" lalu klik "Buat Form Baru". Isi judul dan deskripsi formulir, atur deadline jika diperlukan. Tambahkan field pertanyaan dengan memilih tipe yang sesuai (isian singkat, paragraf, angka, tanggal, pilihan ganda, checkbox, dropdown, atau upload file). Anda juga dapat menggunakan template formulir yang sudah tersedia untuk mempercepat pembuatan.',
      },
      {
        question: 'Bagaimana cara menggunakan template formulir?',
        answer: 'Saat membuat formulir baru, klik tombol "Gunakan Template" di bagian atas. Pilih template yang sesuai kebutuhan (Data Pribadi ASN, Kebutuhan Pelatihan, Laporan Kinerja, Data Aset, atau Absensi Rapat). Template akan mengisi field secara otomatis dan Anda dapat menyesuaikan sesuai kebutuhan.',
      },
      {
        question: 'Bagaimana cara mengelola data ASN?',
        answer: 'Buka menu "Data ASN". Anda dapat menambah ASN satu per satu, mengimpor dari file Excel, mengedit data, dan menghapus ASN. Untuk impor Excel, unduh template yang tersedia, isi data ASN sesuai format, lalu upload file tersebut.',
      },
      {
        question: 'Bagaimana cara mengekspor laporan?',
        answer: 'Buka menu "Laporan", pilih formulir yang ingin dilaporkan. Gunakan filter bidang dan tanggal untuk menyaring data. Klik "Tampilkan" untuk melihat data. Laporan dapat diekspor ke format Excel atau PDF menggunakan tombol yang tersedia.',
      },
      {
        question: 'Bagaimana cara membuat pengumuman?',
        answer: 'Buka menu "Pengumuman" lalu klik "Buat Pengumuman". Isi judul dan konten pengumuman. Anda dapat menyematkan (pin) pengumuman penting agar selalu tampil di atas. Pengumuman akan terlihat oleh semua ASN di halaman beranda mereka.',
      },
      {
        question: 'Bagaimana cara memantau aktivitas sistem?',
        answer: 'Buka menu "Log Aktivitas" untuk melihat semua aktivitas yang terjadi di sistem, termasuk login, pembuatan formulir, pengisian jawaban, dan perubahan data. Anda dapat memfilter berdasarkan jenis aktivitas dan mencari berdasarkan nama pengguna.',
      },
      {
        question: 'Bagaimana cara mencetak laporan resmi?',
        answer: 'Pada halaman Laporan, setelah menampilkan data, klik tombol "Print Laporan" untuk membuka tampilan cetak. Tampilan ini sudah diformat secara profesional dengan header BKAD, data tabel, ringkasan statistik, dan nomor halaman. Gunakan fungsi print browser untuk mencetak atau menyimpan sebagai PDF.',
      },
    ],
  },
]

export default function HelpFAQ({ userRole }: { userRole: 'ADMIN' | 'ASN' }) {
  const { setCurrentView } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        !searchQuery ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((section) => section.items.length > 0)

  const totalItems = filteredSections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView(userRole === 'ADMIN' ? 'admin-dashboard' : 'asn-home')}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Bantuan & FAQ</h2>
            <p className="text-xs text-muted-foreground">
              Pertanyaan yang sering diajukan dan panduan penggunaan
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Cari pertanyaan atau topik..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11"
        />
        {searchQuery && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-xs text-muted-foreground">
              {totalItems} hasil ditemukan
            </span>
          </div>
        )}
      </div>

      {/* FAQ Sections */}
      {filteredSections.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              Tidak ada hasil untuk &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Coba gunakan kata kunci yang berbeda
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((section) => {
            const SectionIcon = section.icon
            return (
              <Card key={section.title} className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      section.title === 'Umum'
                        ? 'bg-blue-50'
                        : section.title === 'Untuk ASN'
                        ? 'bg-emerald-50'
                        : 'bg-amber-50'
                    }`}>
                      <SectionIcon className={`w-4 h-4 ${
                        section.title === 'Umum'
                          ? 'text-blue-600'
                          : section.title === 'Untuk ASN'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {section.items.length} pertanyaan
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="single" collapsible className="w-full">
                    {section.items.map((item, index) => (
                      <AccordionItem
                        key={index}
                        value={`${section.title}-${index}`}
                        className="border-border/40"
                      >
                        <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline hover:text-primary text-left py-3">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Contact Information */}
      <Card className="border-border/60 bg-gradient-to-r from-primary/5 via-white dark:via-card to-gov-green/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Butuh Bantuan Lebih Lanjut?</CardTitle>
              <CardDescription className="text-xs">Hubungi tim BKAD untuk pertanyaan lainnya</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-white/50 dark:bg-card/50">
              <Phone className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Telepon</p>
                <p className="text-sm text-muted-foreground">(0532) 621001</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-white/50 dark:bg-card/50">
              <Mail className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">bkad@seruyankab.go.id</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-white/50 dark:bg-card/50">
              <Globe className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Website</p>
                <p className="text-sm text-muted-foreground">www.seruyankab.go.id</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-white/50 dark:bg-card/50">
              <MapPin className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">Alamat</p>
                <p className="text-sm text-muted-foreground">Jl. Patin No. 1, Kuala Pembuang</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
