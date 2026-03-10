import { Target, Eye, Rocket } from 'lucide-react';

export default function Vision() {
  return (
    <section className="px-12 py-24 bg-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-blue-600 font-bold tracking-widest uppercase text-sm">Our Philosophy</span>
          <h2 className="text-5xl font-extrabold text-slate-900 mt-4 leading-tight">Driven by Vision, <br/>Guided by Precision.</h2>
          <p className="mt-6 text-lg text-slate-500 leading-relaxed">
            We believe that healthcare should be proactive, not reactive. By leveraging AI and real-time monitoring, we aim to transform how individuals interact with their own biology.
          </p>
        </div>
        
        <div className="grid gap-6">
          <VisionCard icon={<Eye className="text-blue-500" />} title="Our Vision" desc="To be the world's most trusted AI health companion." />
          <VisionCard icon={<Target className="text-emerald-500" />} title="Our Goal" desc="Reducing global health risks through early detection patterns." />
        </div>
      </div>
    </section>
  );
}

function VisionCard({ icon, title, desc }: any) {
  return (
    <div className="flex gap-5 p-6 rounded-3xl border border-blue-50 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-50 transition-all">
      <div className="bg-white p-4 rounded-2xl shadow-sm h-fit">{icon}</div>
      <div>
        <h4 className="text-xl font-bold text-slate-800">{title}</h4>
        <p className="text-slate-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}