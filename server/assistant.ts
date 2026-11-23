import type { Booking, Equipment } from '../shared/types.ts'
import { cleanText } from '../shared/sanitize.ts'

export async function answerAssistant(input: {
  message: string
  equipment: Equipment[]
  bookings: Booking[]
}): Promise<{ reply: string; mode: 'demo' | 'genai'; citations: string[] }> {
  const message = cleanText(input.message, 1000)
  const key = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
  if (key && process.env.GEMINI_API_KEY) {
    try {
      const reply = await geminiReply(process.env.GEMINI_API_KEY, message, input.equipment)
      return { reply, mode: 'genai', citations: [] }
    } catch {
      return { ...localReply(message, input.equipment, input.bookings), mode: 'demo' }
    }
  }
  if (key && process.env.OPENAI_API_KEY) {
    try {
      const reply = await openAiReply(process.env.OPENAI_API_KEY, message, input.equipment)
      return { reply, mode: 'genai', citations: [] }
    } catch {
      return { ...localReply(message, input.equipment, input.bookings), mode: 'demo' }
    }
  }
  return { ...localReply(message, input.equipment, input.bookings), mode: 'demo' }
}

function localReply(
  message: string,
  equipment: Equipment[],
  bookings: Booking[],
): { reply: string; citations: string[] } {
  const q = message.toLowerCase()
  const citations: string[] = []
  const find = (pred: (e: Equipment) => boolean) => equipment.filter(pred)

  if (!q) {
    return {
      reply:
        'Ask me about equipment, locations, specifications, or how to book a lab slot. This is the demo assistant using campus catalogue data.',
      citations,
    }
  }

  if (/how.*(book|reserv)|booking procedure|request access/.test(q)) {
    return {
      reply:
        'To book: open Discover, choose equipment, pick a weekday slot, add your project title and deadline, then submit. Confirmed reservations are never overwritten. If faculty approval is required, submit a Project Access Request. Overlaps are flagged by the allocation engine, which uses weighted scoring (deadline, fairness, wait time, duration fit, availability) — not a hidden AI model.',
      citations,
    }
  }

  const matched = find(
    (e) =>
      q.includes(e.name.toLowerCase()) ||
      e.tags.some((t) => q.includes(t)) ||
      e.category.toLowerCase().split(' ').some((w) => q.includes(w)) ||
      (q.includes('gpu') && e.tags.includes('gpu')) ||
      (q.includes('3d') && e.category === '3D Printing') ||
      (q.includes('arduino') && e.id.includes('arduino')) ||
      (q.includes('raspberry') && e.id.includes('rpi')) ||
      (q.includes('scope') && e.tags.includes('scope')) ||
      (q.includes('fpga') && e.tags.includes('fpga')) ||
      (q.includes('robot') && e.category === 'Robotics') ||
      (q.includes('microscop') && e.category === 'Optics'),
  )

  if (matched.length) {
    const lines = matched.slice(0, 3).map((e) => {
      citations.push(e.name)
      const taken = bookings.filter(
        (b) => b.equipmentId === e.id && (b.status === 'confirmed' || b.status === 'pending'),
      )
      const spec = Object.entries(e.specs)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')
      return `• ${e.name} (${e.department}) — ${e.location}. Status: ${e.status}. ${spec}. Active holds: ${taken.length}.`
    })
    const alts = equipment
      .filter((e) => e.category === matched[0].category && !matched.includes(e) && e.status !== 'maintenance')
      .slice(0, 2)
      .map((e) => e.name)
    return {
      reply: `${lines.join('\n')}${alts.length ? `\nAlternatives in the same category: ${alts.join(', ')}.` : ''}`,
      citations,
    }
  }

  if (/available|free slot|when can/.test(q)) {
    const open = equipment.filter((e) => e.status === 'available').map((e) => e.name)
    return {
      reply: `Catalogue items currently marked available: ${open.join(', ')}. Open an equipment page to see weekday slots. Confirmed bookings block the exact slot; pending bookings compete but do not overwrite.`,
      citations: open.slice(0, 4),
    }
  }

  return {
    reply:
      'I can search the demo catalogue for 3D printers, Arduino and Raspberry Pi kits, oscilloscopes, GPU workstations, robotics kits, microscopes and FPGA boards. Try “GPU alternatives” or “how do I book”.',
    citations,
  }
}

async function geminiReply(apiKey: string, message: string, equipment: Equipment[]) {
  const catalogue = equipment
    .map((e) => `${e.name} | ${e.department} | ${e.location} | ${e.status} | ${JSON.stringify(e.specs)}`)
    .join('\n')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are the Labora campus lab assistant. Use only this catalogue:\n${catalogue}\nQuestion: ${message}`,
              },
            ],
          },
        ],
      }),
    },
  )
  if (!res.ok) throw new Error('gemini failed')
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from the model.'
}

async function openAiReply(apiKey: string, message: string, equipment: Equipment[]) {
  const catalogue = equipment.map((e) => `${e.name} (${e.department}) ${e.status}`).join('; ')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Labora lab assistant. Catalogue: ${catalogue}`,
        },
        { role: 'user', content: message },
      ],
    }),
  })
  if (!res.ok) throw new Error('openai failed')
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? 'No response from the model.'
}
