"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Rocket, 
  CalendarDays, 
  BarChart3, 
  Sparkles, 
  MessageSquareReply, 
  Layers,
  Check,
  ChevronDown
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const platforms = [
  'Twitter/X', 'LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'Pinterest', 'Threads', 'Reddit'
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#0a0a0f] text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-[#0a0a0f]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-purple-500" />
            <span className="font-bold text-xl tracking-tight">QuickSocial</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-300">
            <Link href="#features" className="hover:text-white transition">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition">How it Works</Link>
            <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="#faq" className="hover:text-white transition">FAQ</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium hover:text-purple-400 transition hidden sm:block">
              Sign In
            </Link>
            <Link href="/sign-up">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 overflow-hidden">
          <div className="container mx-auto text-center max-w-4xl relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] -z-10"></div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
            >
              Schedule posts across <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                all platforms in one click
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto"
            >
              The ultimate multi-platform social media scheduler. Generate AI content, schedule months in advance, and analyze your growth effortlessly.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/sign-up">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto text-lg h-14 px-8 rounded-full">
                  Start for free today
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 w-full sm:w-auto text-lg h-14 px-8 rounded-full">
                  See how it works
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Platform Strip */}
        <section className="py-10 border-y border-zinc-800 bg-[#111118] overflow-hidden relative flex">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#111118] to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#111118] to-transparent z-10"></div>
          
          <motion.div 
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            className="flex gap-8 px-4 w-max whitespace-nowrap"
          >
            {[...platforms, ...platforms].map((platform, i) => (
              <div key={i} className="px-6 py-3 bg-zinc-900 rounded-full border border-zinc-800 font-medium text-zinc-400">
                {platform}
              </div>
            ))}
          </motion.div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-4 container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Stop jumping between tabs. Manage your entire social presence from one beautiful dashboard.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: CalendarDays, title: 'Visual Calendar', desc: 'Drag and drop your posts into the perfect schedule. See your entire month at a glance.' },
              { icon: Sparkles, title: 'AI Content Generation', desc: 'Writer\'s block is history. Generate engaging captions and ideas instantly with Gemini AI.' },
              { icon: Layers, title: 'Write Once, Post Everywhere', desc: 'Customize your message for each network but publish them all at exactly the right time.' },
              { icon: BarChart3, title: 'Advanced Analytics', desc: 'Understand what works. Track engagement, audience growth, and top-performing content.' },
              { icon: MessageSquareReply, title: 'Smart Auto-Replies', desc: 'Engage with your audience automatically based on keywords and custom rules.' },
              { icon: Rocket, title: 'Asset Library', desc: 'Store your images and videos in one place. Access them instantly when creating new posts.' },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/50 transition duration-300">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-4 bg-[#111118]">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">How it works</h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Three simple steps to social media domination.</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 justify-center max-w-5xl mx-auto">
              {[
                { step: '1', title: 'Connect Accounts', desc: 'Link all your social profiles securely in seconds.' },
                { step: '2', title: 'Create & Schedule', desc: 'Use AI to write posts and place them on your calendar.' },
                { step: '3', title: 'Analyze & Grow', desc: 'Watch the metrics roll in and optimize your strategy.' },
              ].map((item, i) => (
                <div key={i} className="flex-1 text-center relative">
                  {i !== 2 && <div className="hidden md:block absolute top-8 left-[60%] w-full h-[2px] bg-gradient-to-r from-purple-500/50 to-transparent"></div>}
                  <div className="w-16 h-16 rounded-full bg-purple-600 text-2xl font-bold flex items-center justify-center mx-auto mb-6 relative z-10 shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-zinc-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-4 container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Choose the perfect plan for your needs. No hidden fees.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col">
              <h3 className="text-2xl font-semibold mb-2">Free</h3>
              <p className="text-zinc-400 mb-6">Perfect for getting started.</p>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg font-normal text-zinc-500">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                {['3 social accounts', '10 scheduled posts/mo', 'Basic analytics', 'Standard support'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <Check className="w-5 h-5 text-purple-500" /> {feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white h-12 rounded-full">Get Started</Button>
            </div>
            
            {/* Pro Plan */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-purple-900/40 to-zinc-900 border border-purple-500 relative flex flex-col transform md:-translate-y-4 shadow-[0_0_50px_rgba(124,58,237,0.15)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold tracking-wide">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-semibold mb-2">Pro</h3>
              <p className="text-purple-200/70 mb-6">For serious creators.</p>
              <div className="text-4xl font-bold mb-6">$19<span className="text-lg font-normal text-zinc-500">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                {['10 social accounts', 'Unlimited scheduling', 'Advanced AI content generator', 'Smart auto-replies', 'Priority support'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-200">
                    <Check className="w-5 h-5 text-cyan-400" /> {feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 rounded-full">Start 14-Day Trial</Button>
            </div>
            
            {/* Business Plan */}
            <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col">
              <h3 className="text-2xl font-semibold mb-2">Business</h3>
              <p className="text-zinc-400 mb-6">For agencies and teams.</p>
              <div className="text-4xl font-bold mb-6">$49<span className="text-lg font-normal text-zinc-500">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Unlimited social accounts', 'Team collaboration (5 seats)', 'Custom approval workflows', 'White-label reporting', '24/7 dedicated support'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-zinc-300">
                    <Check className="w-5 h-5 text-purple-500" /> {feat}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white h-12 rounded-full">Contact Sales</Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-4 bg-[#111118]">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">Loved by creators</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                { text: "QuickSocial completely transformed my workflow. I save at least 10 hours a week scheduling posts. The AI features are incredibly spot on.", author: "Sarah Jenkins", role: "Digital Marketer" },
                { text: "I've tried every scheduler out there. This is the only one that feels modern, fast, and doesn't crash when I need it most.", author: "Marcus Thorne", role: "Content Creator" },
                { text: "The auto-reply feature alone is worth the Pro subscription. My engagement has doubled since I started using QuickSocial.", author: "Elena Rodriguez", role: "E-commerce Founder" }
              ].map((t, i) => (
                <div key={i} className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <div className="flex gap-1 text-yellow-500 mb-4">
                    {[...Array(5)].map((_, j) => <Sparkles key={j} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-zinc-300 mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-400">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{t.author}</div>
                      <div className="text-xs text-zinc-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 px-4 container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: 'Which social media platforms do you support?', a: 'We currently support Twitter/X, LinkedIn, Instagram, Facebook Pages & Groups, TikTok, YouTube, Pinterest, Threads, and Reddit.' },
              { q: 'Is there a free trial for the Pro plan?', a: 'Yes! We offer a fully-featured 14-day free trial of our Pro plan. No credit card required to start.' },
              { q: 'How does the AI content generation work?', a: 'We use Google\'s Gemini AI under the hood. You just provide a topic, URL, or short thought, and it generates platform-optimized captions and hashtags.' },
              { q: 'Can I upload my own videos and images?', a: 'Absolutely. We have a built-in media library where you can upload, store, and organize all your creative assets.' },
              { q: 'What is the auto-reply feature?', a: 'Auto-reply lets you set up rules to automatically respond to comments or DMs based on specific keywords. It\'s great for delivering lead magnets or answering common questions.' },
              { q: 'Can I cancel my subscription at any time?', a: 'Yes, there are no long-term contracts. You can cancel your subscription at any time from your billing settings.' }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-zinc-800">
                <AccordionTrigger className="text-left text-lg hover:text-purple-400">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-zinc-400 text-base leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-zinc-900 px-4">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Rocket className="w-5 h-5 text-purple-500" />
              <span className="font-bold text-lg">QuickSocial</span>
            </div>
            <p className="text-zinc-500 mb-4">The modern way to manage your social media presence.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Product</h4>
            <ul className="space-y-3 text-zinc-500">
              <li><Link href="#" className="hover:text-purple-400">Features</Link></li>
              <li><Link href="#" className="hover:text-purple-400">Pricing</Link></li>
              <li><Link href="#" className="hover:text-purple-400">Integrations</Link></li>
              <li><Link href="#" className="hover:text-purple-400">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-3 text-zinc-500">
              <li><Link href="#" className="hover:text-purple-400">Blog</Link></li>
              <li><Link href="#" className="hover:text-purple-400">Help Center</Link></li>
              <li><Link href="#" className="hover:text-purple-400">Community</Link></li>
              <li><Link href="#" className="hover:text-purple-400">API Docs</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-3 text-zinc-500">
              <li><Link href="#" className="hover:text-purple-400">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-purple-400">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-purple-400">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto pt-8 border-t border-zinc-900 text-center text-zinc-600 text-sm">
          &copy; {new Date().getFullYear()} QuickSocial. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
