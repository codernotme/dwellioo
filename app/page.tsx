import Link from "next/link";
import Image from "next/image";
import { Button, Card, Chip } from "@heroui/react";
import { 
  Building2, 
  Bell, 
  UserCheck, 
  CreditCard, 
  Calendar, 
  ArrowRight, 
  ChevronRight,
  ShieldCheck,
  Zap,
  LayoutDashboard
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      title: "Notice Board",
      description: "Keep every resident in the loop with categorized, pinned, and scheduled announcements.",
      icon: Bell,
      color: "text-accent",
      link: "/dashboard/notices"
    },
    {
      title: "Visitor Protocol",
      description: "Secure, OTP-based visitor management for peace of mind. Real-time entry/exit logs.",
      icon: UserCheck,
      color: "text-primary",
      link: "/dashboard/visitors"
    },
    {
      title: "Digital Billing",
      description: "Track maintenance, automate dues, and simulate payments in a single unified ledger.",
      icon: CreditCard,
      color: "text-success",
      link: "/dashboard/billing"
    },
    {
      title: "Event Hub",
      description: "Foster community with festival calendars, RSVP tracking, and resident celebrations.",
      icon: Calendar,
      color: "text-secondary",
      link: "/dashboard/events"
    }
  ];

  return (
    <div className="min-h-screen mesh-gradient text-foreground relative overflow-hidden flex flex-col">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between glass px-6 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
              <Building2 className="text-primary" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tightest">dwellioo</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-bold text-default-500 hover:text-white transition-colors">Features</Link>
            <Link href="#" className="text-sm font-bold text-default-500 hover:text-white transition-colors">Pricing</Link>
            <Link href="#" className="text-sm font-bold text-default-500 hover:text-white transition-colors">Enterprise</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-bold text-sm hidden md:flex">Sign In</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="primary" className="font-black text-sm px-6">
                Start Managing
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-32 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-8">
          <Chip color="accent" variant="soft" className="font-black tracking-widest uppercase text-[10px] w-fit">
            Next-Gen PropTech Platform
          </Chip>
          <h1 className="text-5xl md:text-7xl font-black tracking-tightest leading-tight text-glow">
            Property Management <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-secondary">
              in High Definition.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-default-400 font-medium leading-relaxed max-w-lg">
            Dwellioo is the all-in-one ecosystem for managers and residents. 
            Streamline operations, automate billing, and build a vibrant community in clicks.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto h-14 px-8 text-lg font-black tracking-tight shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                Get Started for Free
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto h-14 px-8 text-lg font-bold glass">
                Explore Demo
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-default-200" />
              ))}
            </div>
            <p className="text-sm font-bold text-default-500">Trusted by <span className="text-white">500+ managers</span> globally.</p>
          </div>
        </div>

        <div className="relative group perspective-1000">
           <div className="glass p-4 rounded-3xl [transform:rotateY(-15deg)_rotateX(10deg)] transition-all duration-700 group-hover:rotate-0">
             <div className="overflow-hidden rounded-2xl bg-slate-900 border border-white/5 relative aspect-square md:aspect-video">
                <Image 
                  src="/hero-visual.png" 
                  alt="Dwellioo Dashboard" 
                  fill 
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover opacity-80" 
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                   <div className="glass p-4 rounded-xl flex items-center gap-4">
                      <div className="p-3 bg-success/20 rounded-full">
                         <Zap className="text-success" size={24} />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-default-400">Total Collection</p>
                         <p className="text-xl font-black">₹ 1,24,500</p>
                      </div>
                   </div>
                </div>
             </div>
           </div>
           
           {/* Floating elements */}
           <div className="absolute top-10 -right-10 glass p-6 rounded-2xl hidden md:block animate-bounce shadow-2xl">
              <div className="flex items-center gap-3">
                 <ShieldCheck className="text-success" size={24} />
                 <div>
                    <p className="text-xs font-bold text-default-400">Security Status</p>
                    <p className="text-sm font-black">FULLY SECURED</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Feature Mesh */}
      <section id="features" className="px-6 py-32 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-gradient text-xs font-black tracking-widest leading-loose uppercase mb-4">The Dwellioo Experience</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tightest mb-6">Everything you need. <br/>All in one place.</h3>
            <p className="text-default-500 max-w-2xl mx-auto font-medium">Built for speed, reliability, and most importantly, simplicity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, idx) => (
              <Link key={idx} href={feature.link}>
                <Card className="glass p-8 flex flex-col gap-6 hover:bg-white/5 transition-all group h-full">
                  <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 ${feature.color} group-hover:scale-110 transition-transform`}>
                    <feature.icon size={28} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 tracking-tight">{feature.title}</h4>
                    <p className="text-sm text-default-400 leading-relaxed font-medium">{feature.description}</p>
                  </div>
                  <div className="mt-auto pt-4 flex items-center text-xs font-bold gap-2 text-default-300 group-hover:text-white transition-colors">
                    Explore Feature
                    <ChevronRight size={14} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Social Section */}
      <section className="px-6 py-32 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
           <div className="flex flex-col gap-10">
              <h3 className="text-4xl md:text-5xl font-black tracking-tightest">Built by Managers, <br/>Loved by Residents.</h3>
              
              <div className="flex flex-col gap-6">
                {[
                  { title: "One-Click Setup", desc: "Launch your property in minutes with our intuitive onboarding flow." },
                  { title: "Universal Access", desc: "Accessible via mobile or desktop for residents on the move." },
                  { title: "Ironclad Security", desc: "Enterprise-grade encryption for all resident and payment data." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 text-accent group-hover:rotate-12 transition-transform">
                      {i + 1}
                    </div>
                    <div>
                      <h5 className="font-bold text-lg mb-1">{item.title}</h5>
                      <p className="text-default-400 text-sm font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/dashboard">
                <Button variant="ghost" className="w-fit h-12 px-8 font-black glass mt-4">
                  See the Dashboard
                </Button>
              </Link>
           </div>

           <div className="glass p-12 rounded-[3.5rem] relative">
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-secondary/30 blur-3xl animate-pulse" />
              <div className="flex flex-col gap-8 items-center text-center">
                 <div className="w-20 h-20 bg-default-100 rounded-full" />
                 <p className="text-2xl font-medium tracking-tight italic opacity-90">
                   "Dwellioo changed how we manage our society. Late payments are down 40% and communication is now instantaneous."
                 </p>
                 <div>
                    <p className="font-bold text-lg">Aryan Sharma</p>
                    <p className="text-sm font-bold text-primary tracking-widest uppercase">Property Manager, DLF Phase 3</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-32">
        <div className="max-w-5xl mx-auto glass p-12 md:p-20 rounded-[4rem] text-center flex flex-col items-center gap-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px]" />
           <h3 className="text-4xl md:text-6xl font-black tracking-tightest leading-tight">Ready to modernize your <br/>property management?</h3>
           <Link href="/onboarding">
             <Button variant="primary" className="h-16 px-12 text-xl font-black tracking-tight shadow-2xl">
               Get Started for Free
               <ChevronRight size={24} className="ml-2" />
             </Button>
           </Link>
           <p className="font-bold text-default-500">No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* Main Footer */}
      <footer className="px-6 py-20 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="flex flex-col gap-6 max-w-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Building2 className="text-primary" size={20} />
              </div>
              <span className="text-xl font-black uppercase tracking-widest">dwellioo</span>
            </div>
            <p className="text-sm text-default-500 font-medium leading-relaxed">
              Leading the high-fidelity property management revolution. Secure, simple, smart.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-24">
            <div className="flex flex-col gap-4">
              <p className="font-black text-xs uppercase tracking-[0.2em] text-default-400">Product</p>
              <Link href="#" className="text-sm font-bold text-default-500 hover:text-white">Features</Link>
              <Link href="#" className="text-sm font-bold text-default-500 hover:text-white">Security</Link>
              <Link href="#" className="text-sm font-bold text-default-500 hover:text-white">Enterprise</Link>
            </div>
            <div className="flex flex-col gap-4">
              <p className="font-black text-xs uppercase tracking-[0.2em] text-default-400">Company</p>
              <Link href="#" className="text-sm font-bold text-default-500 hover:text-white">About</Link>
              <Link href="#" className="text-sm font-bold text-default-500 hover:text-white">Careers</Link>
              <Link href="#" className="text-sm font-bold text-default-500 hover:text-white">Contact</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
           <p className="text-xs font-bold text-default-500 tracking-wider">© 2026 dwellioo technologies. All rights reserved.</p>
           <div className="flex items-center gap-8">
              <Link href="#" className="text-xs font-bold text-default-500 hover:text-white">Privacy Policy</Link>
              <Link href="#" className="text-xs font-bold text-default-500 hover:text-white">Terms of Use</Link>
           </div>
        </div>
      </footer>
    </div>
  );
}
