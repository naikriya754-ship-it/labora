import { useState } from 'react'
import { api } from '../api.ts'

interface Msg { role: 'user' | 'bot'; text: string; mode?: string }

export function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'bot',
      text: 'Demo Lab Assistant. I search the campus catalogue and booking rules. Set GEMINI_API_KEY or OPENAI_API_KEY on the server to enable a GenAI backend — keys never ship in the browser.',
      mode: 'demo',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setBusy(true)
    try {
      const res = await api.assistant(text)
      setMessages((m) => [...m, { role: 'bot', text: res.reply, mode: res.mode }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: (err as Error).message, mode: 'error' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="kicker">Guidance</p>
          <h1>AI lab assistant</h1>
          <p className="muted">Local demo replies unless a server-side GenAI key is configured.</p>
        </div>
      </div>
      <section className="card chat">
        <div className="bubbles" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
              {m.mode === 'demo' && m.role === 'bot' && <strong>Demo assistant · </strong>}
              {m.mode === 'genai' && <strong>GenAI · </strong>}
              <span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>
            </div>
          ))}
          {busy && <div className="bubble bot">Looking through the catalogue…</div>}
        </div>
        <form className="chat-form" onSubmit={(e) => void send(e)}>
          <label className="sr-only" htmlFor="ask" style={{ position: 'absolute', left: -9999 }}>Ask the assistant</label>
          <input id="ask" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Find a GPU or explain booking rules" />
          <button className="btn btn-primary" type="submit" disabled={busy}>Send</button>
        </form>
      </section>
    </div>
  )
}
