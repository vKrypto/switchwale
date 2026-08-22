import type { FormEvent } from 'react';
import { User, Mail, Phone, Briefcase, IndianRupee, Clock, Send, Upload } from 'lucide-react';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import { addEvent } from './lib/events';

const WHATSAPP_NUMBER = '917355437836';

function buildWhatsAppMessage(form: FormData): string {
  const get = (key: string) => (form.get(key) as string | null)?.trim() || '-';
  return [
    `Hi! I'm ${get('name')}.`,
    `I'm currently working as ${get('title')} with ${get('experience')} of experience.`,
    `My expected CTC is ${get('salary')}.`,
  ].join(' ');
}

function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const resume = form.get('resume') as File | null;
  void addEvent('lead_generation', 'contact_form_submit', 1, {
    name: form.get('name'),
    email: form.get('email'),
    phone: form.get('phone'),
    title: form.get('title'),
    experience: form.get('experience'),
    salary: form.get('salary'),
    has_resume: !!resume && resume.size > 0,
  });
  const message = buildWhatsAppMessage(form);
  window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

type FieldProps = {
  icon: typeof User;
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
};

function Field({ icon: Icon, label, name, type = 'text', autoComplete, placeholder, required }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-brand-600 dark:text-brand-500"> *</span>}
      </label>
      <div className="relative">
        <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          id={name}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
        />
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SiteHeader />

      <main className="max-w-xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-500">Let's talk</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Tell us about yourself</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            A few details and we'll pick it up on WhatsApp — no forms disappearing into a void.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8">
          <Field icon={User} label="Full name" name="name" autoComplete="name" required placeholder="Jane Doe" />
          <Field icon={Mail} label="Email" name="email" type="email" autoComplete="email" required placeholder="jane@example.com" />
          <Field icon={Phone} label="Contact number" name="phone" type="tel" autoComplete="tel" required placeholder="+91 98765 43210" />
          <Field icon={Briefcase} label="Current title" name="title" autoComplete="organization-title" placeholder="Senior Software Engineer" />
          <Field icon={Clock} label="Total experience" name="experience" placeholder="e.g. 5 years" />
          <Field icon={IndianRupee} label="Target salary" name="salary" placeholder="e.g. 18-20 LPA" />

          <div>
            <label htmlFor="resume" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Resume <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Upload size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 dark:file:bg-gray-800 file:text-brand-700 dark:file:text-brand-500 file:px-3 file:py-1.5 file:text-sm file:font-medium focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              We'll open WhatsApp with your name on it — just drag the file into the chat once it opens.
            </p>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 transition-colors"
          >
            Continue on WhatsApp
            <Send size={18} />
          </button>
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            Submitting opens WhatsApp with your details pre-filled — nothing is sent until you hit send there.
          </p>
        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
