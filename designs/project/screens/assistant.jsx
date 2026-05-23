/* ============================================================
   Gabon Connect — Assistant IA contextuel
   Bulle flottante · chat texte · mode audio non-bloquant
   ============================================================ */

/* ---------- Marqueur visuel IA ---------- */
const AIGlyph = ({ size = 32, ring = false }) => (
  <span style={{
    width: size, height: size, borderRadius: size / 2,
    background: 'radial-gradient(120% 120% at 30% 25%, #2378c3 0%, #1a4480 55%, #061a3d 100%)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', position: 'relative', flexShrink: 0,
    boxShadow: ring ? '0 0 0 4px rgba(35,120,195,.18), 0 6px 16px rgba(6,26,61,.35)' : '0 4px 10px rgba(6,26,61,.30)',
  }}>
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5 13.4 9.2 20 10.8 13.6 13 12 21 10.4 13 4 10.8 10.6 9.2z" fill="white"/>
      <circle cx="19" cy="5" r="1.4" fill="white" opacity="0.85"/>
      <circle cx="5" cy="18" r="1" fill="white" opacity="0.7"/>
    </svg>
    {/* Marqueur tricolore */}
    <span style={{
      position: 'absolute', bottom: -1, right: -1,
      width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28), borderRadius: 99,
      border: '2px solid white', background: '#fcd116',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.05)',
    }}/>
  </span>
);

/* ---------- Onde sonore animée ---------- */
const Waveform = ({ active = true, color = 'white', height = 22, bars = 9, intensity = 1 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height }}>
    {Array.from({ length: bars }).map((_, i) => {
      const phases = [0.4, 0.85, 0.55, 1, 0.7, 0.95, 0.5, 0.8, 0.45];
      const h = phases[i % phases.length] * intensity;
      const dur = 0.7 + (i % 4) * 0.18;
      const delay = (i * 0.09) % 1.2;
      return (
        <span key={i} style={{
          display: 'block', width: 3,
          height: `${Math.max(20, h * 100)}%`,
          background: color, borderRadius: 3,
          transformOrigin: 'center',
          animation: active ? `gc-wave ${dur}s ease-in-out ${delay}s infinite alternate` : 'none',
          opacity: active ? 1 : 0.35,
        }}/>
      );
    })}
  </span>
);

/* ---------- Chip de contexte ---------- */
const ContextChip = ({ context, tone = 'light' }) => {
  const styles = tone === 'dark'
    ? { bg: 'rgba(255,255,255,.10)', fg: 'rgba(255,255,255,.92)', border: 'rgba(255,255,255,.18)', soft: 'rgba(255,255,255,.55)' }
    : { bg: '#f3f5f9', fg: 'var(--ink-800)', border: 'var(--ink-200)', soft: 'var(--ink-500)' };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 10px 6px 8px', background: styles.bg,
      border: `1px solid ${styles.border}`, borderRadius: 999,
      fontSize: 11.5, color: styles.fg, fontWeight: 500,
    }}>
      <Icon name="layers" size={12} style={{ color: styles.soft }}/>
      <span style={{ color: styles.soft, fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {context.app}
      </span>
      <span style={{ width: 1, height: 10, background: styles.border }}/>
      <span style={{ fontWeight: 600 }}>{context.screen}</span>
      {context.detail && (<>
        <span style={{ color: styles.soft }}>·</span>
        <span style={{ color: styles.soft }}>{context.detail}</span>
      </>)}
    </div>
  );
};

/* ---------- Bulle fermée (pastille flottante) ---------- */
const AssistantBubble = ({ nudge, anchor = { bottom: 24, right: 24 } }) => (
  <div style={{ position: 'absolute', ...anchor, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
    {nudge && (
      <div style={{
        background: 'white', border: '1px solid var(--ink-200)', borderRadius: 12,
        boxShadow: '0 12px 28px rgba(14,26,43,.14)', padding: '12px 14px',
        maxWidth: 280, fontSize: 13, color: 'var(--ink-800)', lineHeight: 1.45,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--primary-500)' }}/>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--primary-500)' }}>Suggestion</span>
        </div>
        {nudge}
        <span style={{ position: 'absolute', bottom: -7, right: 22, width: 12, height: 12, background: 'white', borderRight: '1px solid var(--ink-200)', borderBottom: '1px solid var(--ink-200)', transform: 'rotate(45deg)' }}/>
      </div>
    )}
    <button style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px 10px 10px',
      background: 'var(--ink-900)', border: 'none', borderRadius: 999,
      color: 'white', cursor: 'pointer',
      boxShadow: '0 16px 32px rgba(6,26,61,.30), 0 2px 6px rgba(6,26,61,.20)',
    }}>
      <AIGlyph size={32}/>
      <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '0.01em' }}>Assistant</span>
      <span style={{
        marginLeft: 4, padding: '2px 6px', borderRadius: 4, fontSize: 10,
        fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.75)',
      }}>⌘ K</span>
    </button>
  </div>
);

/* ---------- Bulle de message ---------- */
const ChatMessage = ({ role, children, sources, actions }) => {
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={{
          maxWidth: '82%', background: 'var(--primary-500)', color: 'white',
          padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
          fontSize: 13.5, lineHeight: 1.55,
        }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'flex-start' }}>
      <AIGlyph size={26}/>
      <div style={{ maxWidth: '82%' }}>
        <div style={{
          background: 'white', border: '1px solid var(--ink-200)', color: 'var(--ink-900)',
          padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
          fontSize: 13.5, lineHeight: 1.55,
        }}>{children}</div>
        {sources && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {sources.map(s => (
              <span key={s} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: 'var(--ink-600)', padding: '3px 7px',
                background: 'var(--ink-100)', borderRadius: 4, fontFamily: 'var(--font-mono)',
              }}>
                <Icon name="fileText" size={10}/>{s}
              </span>
            ))}
          </div>
        )}
        {actions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {actions.map(a => (
              <button key={a.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', background: 'white', border: '1px solid var(--primary-300)',
                color: 'var(--primary-600)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                {a.icon && <Icon name={a.icon} size={12}/>}{a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Panneau de chat texte ---------- */
const AssistantPanel = ({ context, greeting, suggestions = [], messages = [], anchor = { bottom: 24, right: 24 }, width = 420, height = 620 }) => (
  <div style={{
    position: 'absolute', ...anchor, zIndex: 60,
    width, height, background: 'var(--ink-50)', borderRadius: 16,
    boxShadow: '0 24px 60px rgba(6,26,61,.28), 0 4px 12px rgba(6,26,61,.10)',
    border: '1px solid var(--ink-200)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    fontFamily: 'var(--font-sans)',
  }}>
    {/* Header */}
    <div style={{
      background: 'linear-gradient(180deg, #0b2350 0%, #162e51 100%)',
      color: 'white', padding: '14px 16px 14px 16px',
      borderBottom: '1px solid rgba(255,255,255,.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <AIGlyph size={36} ring/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>Assistant Connect</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, padding: '2px 6px', borderRadius: 99,
              background: 'rgba(46,133,64,.22)', color: '#9ce0a6', fontWeight: 600,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: '#5cd66f' }}/>
              en ligne
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>
            IA souveraine · réponses limitées à vos données
          </div>
        </div>
        <button style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', color: 'white', width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="minus" size={14}/>
        </button>
        <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.7)', width: 32, height: 32, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="x" size={16}/>
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        <ContextChip context={context} tone="dark"/>
      </div>
    </div>

    {/* Body — thread */}
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
      {greeting && (
        <ChatMessage role="assistant">{greeting}</ChatMessage>
      )}
      {messages.map((m, i) => (
        <ChatMessage key={i} role={m.role} sources={m.sources} actions={m.actions}>{m.text}</ChatMessage>
      ))}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-500)', marginBottom: 8 }}>
            Suggestions pour cette page
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {suggestions.map(s => (
              <button key={s} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', textAlign: 'left',
                background: 'white', border: '1px solid var(--ink-200)', borderRadius: 8,
                color: 'var(--ink-800)', fontSize: 13, cursor: 'pointer', lineHeight: 1.4,
              }}>
                <Icon name="arrowRight" size={12} style={{ color: 'var(--primary-500)', flexShrink: 0 }}/>
                <span>{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Composer */}
    <div style={{ borderTop: '1px solid var(--ink-200)', background: 'white', padding: '10px 12px 12px' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        border: '1px solid var(--ink-300)', borderRadius: 12, background: 'white',
        padding: '8px 8px 8px 12px',
      }}>
        <textarea rows={1} placeholder="Posez votre question…" style={{
          flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink-900)', lineHeight: 1.5,
          padding: '4px 0', minHeight: 22,
        }}/>
        <button title="Joindre un fichier" style={iconBtn('ghost')}>
          <Icon name="paperclip" size={16}/>
        </button>
        <button title="Passer en mode audio" style={iconBtn('outline')}>
          <Icon name="phone" size={14}/>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Audio</span>
        </button>
        <button title="Envoyer" style={iconBtn('primary')}>
          <Icon name="arrowUp" size={16}/>
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 10.5, color: 'var(--ink-500)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="shieldCheck" size={11}/>
          Données conservées 30 j · hébergées 🇬🇦
        </span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>Entrée pour envoyer</span>
      </div>
    </div>
  </div>
);

/* Petit util bouton d'icône */
const iconBtn = (kind = 'ghost') => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 32, padding: kind === 'outline' ? '0 10px' : '0 8px',
    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
  };
  if (kind === 'primary') return { ...base, background: 'var(--primary-500)', border: '1px solid var(--primary-500)', color: 'white', width: 32, padding: 0, justifyContent: 'center' };
  if (kind === 'outline') return { ...base, background: 'white', border: '1px solid var(--ink-300)', color: 'var(--ink-700)' };
  return { ...base, background: 'transparent', border: 'none', color: 'var(--ink-500)', width: 32, padding: 0, justifyContent: 'center' };
};

/* ---------- Pilule mode audio (compact, non-bloquant) ---------- */
const AssistantAudioPill = ({
  state = 'speaking',           // 'listening' | 'speaking' | 'thinking'
  context,
  transcript,
  duration = '0:42',
  anchor = { bottom: 24, right: 24 },
  expanded = false,
}) => {
  const stateLabel = {
    listening: 'Je vous écoute…',
    speaking: 'L\'assistant parle…',
    thinking: 'Recherche en cours…',
  }[state];
  return (
    <div style={{
      position: 'absolute', ...anchor, zIndex: 60,
      width: expanded ? 380 : 340,
      background: 'linear-gradient(180deg, #0b2350 0%, #061a3d 100%)',
      borderRadius: 18, color: 'white',
      boxShadow: '0 24px 50px rgba(6,26,61,.40), 0 0 0 1px rgba(35,120,195,.25)',
      overflow: 'hidden', fontFamily: 'var(--font-sans)',
    }}>
      {/* Halo top */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #009e60, #fcd116, #3a75c4)' }}/>

      {/* Ligne contexte */}
      <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'rgba(255,255,255,.65)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <Icon name="layers" size={10}/>{context.app} · {context.screen}
        </span>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.65)', fontFamily: 'var(--font-mono)' }}>{duration}</span>
      </div>

      {/* Cœur de la pilule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 12px' }}>
        <div style={{ position: 'relative' }}>
          <AIGlyph size={42} ring/>
          {state === 'listening' && (
            <span style={{
              position: 'absolute', inset: -6, borderRadius: 99,
              border: '2px solid rgba(92, 214, 111, .55)',
              animation: 'gc-ping 1.8s ease-out infinite',
            }}/>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: state === 'listening' ? '#5cd66f' : state === 'speaking' ? '#73b3e7' : '#fcd116' }}/>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{stateLabel}</span>
          </div>
          <Waveform active color="rgba(255,255,255,.85)" height={20} bars={10} intensity={state === 'thinking' ? 0.5 : 1}/>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button title="Couper le micro" style={pillBtn()}>
            <Icon name="phone" size={14} style={{ transform: 'rotate(135deg)' }}/>
          </button>
        </div>
      </div>

      {/* Transcription en direct */}
      {transcript && (
        <div style={{
          padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.10)',
          background: 'rgba(255,255,255,.04)', fontSize: 12.5, lineHeight: 1.5,
          color: 'rgba(255,255,255,.86)',
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: 4 }}>
            {state === 'listening' ? 'Vous' : 'Assistant'}
          </div>
          “{transcript}”
        </div>
      )}

      {/* Barre actions secondaires */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,.08)',
        background: 'rgba(0,0,0,.20)',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button title="Mode muet" style={pillBtn('subtle')}>
            <Icon name="phone" size={13}/>
            <span style={{ fontSize: 11.5 }}>Muet</span>
          </button>
          <button title="Ouvrir le chat" style={pillBtn('subtle')}>
            <Icon name="messageSquare" size={13}/>
            <span style={{ fontSize: 11.5 }}>Texte</span>
          </button>
        </div>
        <button style={{ ...pillBtn('danger'), padding: '0 12px' }}>
          <span style={{ fontSize: 11.5, fontWeight: 600 }}>Raccrocher</span>
        </button>
      </div>
    </div>
  );
};

const pillBtn = (kind = 'default') => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 28, padding: kind === 'default' ? 0 : '0 10px', width: kind === 'default' ? 28 : 'auto',
    borderRadius: 8, cursor: 'pointer', justifyContent: 'center',
    fontFamily: 'inherit', color: 'white',
  };
  if (kind === 'danger') return { ...base, background: '#b50909', border: '1px solid #b50909' };
  if (kind === 'subtle') return { ...base, background: 'transparent', border: '1px solid rgba(255,255,255,.16)', color: 'rgba(255,255,255,.85)' };
  return { ...base, background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.18)' };
};

/* ============================================================
   ART · 1 — Concept overview (hero)
   ============================================================ */
const AssistantConcept = () => (
  <Frame width={1440} height={900} style={{ background: '#f4f6fb', overflow: 'hidden' }}>
    <RepublicBar/>
    <div style={{ padding: '36px 64px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-500)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--primary-500)' }}/>
        Brique transverse — Toutes apps
      </div>
      <h1 style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 10, maxWidth: 1000 }}>
        Un assistant IA souverain, <span style={{ color: 'var(--primary-500)' }}>contextuel à chaque écran</span>, qui parle ou écrit.
      </h1>
      <p style={{ fontSize: 16, color: 'var(--ink-600)', marginTop: 12, maxWidth: 880, lineHeight: 1.55 }}>
        Une seule bulle flottante, présente dans les trois applications. Elle connaît la page que vous consultez, la démarche en cours, le rôle de l'utilisateur. On peut lui écrire — ou lui parler en gardant les deux mains libres pour continuer à travailler.
      </p>
    </div>

    {/* Trois états */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, padding: '36px 64px' }}>
      {/* État 1 : bulle */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--ink-200)', padding: 24, position: 'relative', overflow: 'hidden', minHeight: 420 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-500)', fontWeight: 700, letterSpacing: '0.04em' }}>01 · DORMANT</div>
        <h3 style={{ fontSize: 20, marginTop: 8, letterSpacing: '-0.01em' }}>Pastille flottante</h3>
        <p style={{ fontSize: 13.5, color: 'var(--ink-600)', marginTop: 6, lineHeight: 1.55 }}>
          Toujours présente, bas-droite, raccourci ⌘K. Quand l'IA détecte un contexte utile, elle pousse une suggestion discrète sans interrompre la tâche.
        </p>
        <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: 240, background: 'linear-gradient(180deg, transparent, #eef2f8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 24 }}>
          <AssistantBubble nudge="Besoin d'aide pour ce formulaire ? Je peux le pré-remplir avec votre dossier." anchor={{ bottom: 24, right: 24 }}/>
        </div>
      </div>

      {/* État 2 : chat */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--ink-200)', padding: 24, position: 'relative', overflow: 'hidden', minHeight: 420 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-500)', fontWeight: 700, letterSpacing: '0.04em' }}>02 · CHAT TEXTE</div>
        <h3 style={{ fontSize: 20, marginTop: 8, letterSpacing: '-0.01em' }}>Panneau conversationnel</h3>
        <p style={{ fontSize: 13.5, color: 'var(--ink-600)', marginTop: 6, lineHeight: 1.55 }}>
          Le panneau s'ancre sans recouvrir le contenu critique. Bandeau de contexte permanent, suggestions adaptées à la page, réponses sourcées sur les textes officiels.
        </p>
        <div style={{ position: 'absolute', inset: 'auto 0 -20px 0', height: 280, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', width: 320, height: 270, transform: 'scale(.78)', transformOrigin: 'bottom center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'var(--ink-50)', borderRadius: 14, border: '1px solid var(--ink-200)', overflow: 'hidden', boxShadow: '0 18px 36px rgba(6,26,61,.18)' }}>
              <div style={{ background: '#0b2350', color: 'white', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AIGlyph size={26}/>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Assistant Connect</div>
              </div>
              <div style={{ padding: 10, fontSize: 11, color: 'var(--ink-800)' }}>
                <div style={{ background: 'white', border: '1px solid var(--ink-200)', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                  Quels documents accepte le service&nbsp;?
                </div>
                <div style={{ background: 'var(--primary-500)', color: 'white', padding: 8, borderRadius: 8, marginLeft: 28 }}>
                  Pour un acte de naissance, présentez votre CNI et le livret de famille…
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* État 3 : audio */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--ink-200)', padding: 24, position: 'relative', overflow: 'hidden', minHeight: 420 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary-500)', fontWeight: 700, letterSpacing: '0.04em' }}>03 · MODE AUDIO</div>
        <h3 style={{ fontSize: 20, marginTop: 8, letterSpacing: '-0.01em' }}>Pilule vocale, non-bloquante</h3>
        <p style={{ fontSize: 13.5, color: 'var(--ink-600)', marginTop: 6, lineHeight: 1.55 }}>
          Une conversation orale qui ne masque rien. La pilule reste compacte en bas, on continue à cliquer, saisir, valider. Transcription en direct, mute, raccrocher.
        </p>
        <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: 240, background: 'linear-gradient(180deg, transparent, #eef2f8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
          <AssistantAudioPill
            state="speaking"
            context={{ app: 'Démo', screen: 'Mode vocal' }}
            transcript="Vous pouvez utiliser un livret de famille endommagé tant que les mentions principales restent lisibles."
            duration="0:42"
            anchor={{ bottom: 16, right: 16 }}
          />
        </div>
      </div>
    </div>

    {/* Bandeau capacités */}
    <div style={{ margin: '0 64px 36px', background: 'var(--ink-900)', color: 'white', borderRadius: 14, padding: '18px 24px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Capacités contextuelles</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Ce que l'IA sait</div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { i: 'user', t: 'Profil et NIP de l\'utilisateur' },
          { i: 'fileText', t: 'Démarche en cours (étape, pièces)' },
          { i: 'building', t: 'Rôle et organisme d\'appartenance' },
          { i: 'archive', t: 'Textes officiels (loi 001/2011, NF Z42-013…)' },
          { i: 'database', t: 'Historique des demandes (consentement)' },
          { i: 'shield', t: 'Aucun appel externe · IA hébergée au Gabon' },
        ].map(b => (
          <div key={b.t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,.07)', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
            <Icon name={b.i} size={13}/>{b.t}
          </div>
        ))}
      </div>
    </div>
  </Frame>
);

/* ============================================================
   ART · 2 — Bulle dormante sur l'accueil citoyen
   ============================================================ */
const AssistantOnCitizenHome = () => (
  <div style={{ width: 1440, position: 'relative' }}>
    <CitizenHome/>
    <AssistantBubble
      nudge={<>Marie, un acte de naissance vous est demandé pour votre dossier CNI&nbsp;? Je peux lancer la démarche.</>}
      anchor={{ bottom: 28, right: 28 }}
    />
  </div>
);

/* ============================================================
   ART · 3 — Chat texte ouvert pendant le wizard citoyen (étape pièces)
   ============================================================ */
const AssistantChatOnCitizenWizard = () => (
  <div style={{ width: 1440, position: 'relative' }}>
    <CitizenDeposit initialStep={2}/>
    <AssistantPanel
      context={{ app: 'Espace citoyen', screen: 'Dépôt — Acte de naissance', detail: 'Étape 3 sur 4 · Pièces' }}
      greeting={<>Bonjour Marie. Je vois que vous en êtes aux <b>pièces justificatives</b>. Trois documents sont attendus pour ce service. Je peux vérifier la qualité de vos scans, ou répondre à vos questions.</>}
      suggestions={[
        'Quels documents sont acceptés ?',
        'Comment numériser correctement avec mon téléphone ?',
        'Je n\'ai pas mon livret de famille, est-ce bloquant ?',
        'Vérifie la lisibilité de mes pièces déjà chargées',
      ]}
      messages={[
        { role: 'user', text: 'Mon livret de famille est abîmé, est-ce un problème ?' },
        {
          role: 'assistant',
          text: <>Pas nécessairement. La <b>Direction Gén. de l'État Civil</b> accepte les livrets endommagés tant que les mentions principales (noms, dates, lieux) restent lisibles. Si certaines mentions sont effacées, vous pouvez en parallèle demander un <b>duplicata gratuit</b> (délai 5 jours).</>,
          sources: ['Art. 47 Code civil', 'DG-EC · Procédure 2024-12'],
          actions: [
            { label: 'Lancer la demande de duplicata', icon: 'plus' },
            { label: 'Voir la procédure complète', icon: 'externalLink' },
          ],
        },
      ]}
      anchor={{ bottom: 28, right: 28 }}
    />
  </div>
);

/* ============================================================
   ART · 4 — Mode audio actif pendant le wizard (non bloquant)
   ============================================================ */
const AssistantAudioOnCitizenWizard = () => (
  <div style={{ width: 1440, position: 'relative' }}>
    <CitizenDeposit initialStep={1}/>
    <AssistantAudioPill
      state="speaking"
      context={{ app: 'Espace citoyen', screen: 'Dépôt étape 2' }}
      transcript="Vous pouvez laisser le champ « second prénom » vide — il n'est obligatoire que si votre acte d'origine en mentionne un."
      duration="1:08"
      anchor={{ bottom: 28, right: 28 }}
    />
    {/* Petite indication visuelle "vous continuez à travailler" */}
    <div style={{
      position: 'absolute', bottom: 28, left: 28, zIndex: 60,
      background: 'white', border: '1px solid var(--ink-200)', borderRadius: 12,
      padding: '10px 14px', maxWidth: 280, boxShadow: '0 8px 20px rgba(14,26,43,.08)',
      fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--primary-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        <Icon name="info" size={11}/>Mode mains libres
      </div>
      Continuez à remplir le formulaire — l'assistant entend vos questions et répond pendant que vous saisissez.
    </div>
  </div>
);

/* ============================================================
   ART · 5 — Chat texte côté agent (instruction d'une demande)
   ============================================================ */
const AssistantChatOnAdminInstruction = () => (
  <div style={{ width: 1440, position: 'relative' }}>
    <AdminInstruction/>
    <AssistantPanel
      context={{ app: 'Admin', screen: 'Instruction', detail: '#2024-EC-08471 · NDONG P.' }}
      greeting={
        <>
          <div style={{ marginBottom: 8 }}><b>Synthèse de dossier</b> — préparée à votre ouverture :</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Demande déposée le <b>12 / 04</b> · 3 pièces conformes</li>
            <li>Vérification croisée NIP <b>OK</b> (DGDI)</li>
            <li>Antériorité : 2 actes déjà délivrés en 2023</li>
            <li>Aucune incohérence détectée par les contrôles automatiques</li>
          </ul>
        </>
      }
      suggestions={[
        'Rédige-moi un brouillon de réponse favorable',
        'Quels motifs de rejet sont applicables ici ?',
        'Compare avec les 5 dernières demandes similaires',
        'Pré-remplis le formulaire d\'acte',
      ]}
      messages={[
        { role: 'user', text: 'Y a-t-il un signal d\'attention sur ce dossier ?' },
        {
          role: 'assistant',
          text: <>Un seul point à vérifier : la <b>commune de naissance déclarée (Mouila)</b> diffère de celle des deux actes délivrés en 2023 (Libreville). Probablement une faute de saisie côté citoyen — je recommande une <b>demande de précision</b> avant validation.</>,
          actions: [
            { label: 'Envoyer une demande de précision', icon: 'mail' },
            { label: 'Voir l\'historique du citoyen', icon: 'user' },
          ],
        },
      ]}
      anchor={{ bottom: 28, right: 28 }}
    />
  </div>
);

/* ============================================================
   ART · 6 — Mode audio côté agent (revue documentaire)
   ============================================================ */
const AssistantAudioOnAdminInstruction = () => (
  <div style={{ width: 1440, position: 'relative' }}>
    <AdminInstruction/>
    <AssistantAudioPill
      state="listening"
      context={{ app: 'Admin', screen: 'Instruction · #2024-EC-08471' }}
      transcript="Lis-moi le passage relatif aux mentions marginales pour le dossier en cours."
      duration="0:23"
      anchor={{ bottom: 28, right: 28 }}
    />
  </div>
);

/* ============================================================
   ART · 7 — Chat texte côté plateforme (supervision)
   ============================================================ */
const AssistantChatOnPlatform = () => (
  <div style={{ width: 1440, position: 'relative' }}>
    <PlatformSupervision/>
    <AssistantPanel
      context={{ app: 'Console', screen: 'Supervision', detail: '47 organismes' }}
      greeting={
        <>
          <div style={{ marginBottom: 6 }}><b>2 anomalies détectées</b> sur les 24 dernières heures :</div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li><b>DGDI</b> — temps moyen de traitement <b>+47 %</b> (file de 1 840 demandes)</li>
            <li><b>Mairie Libreville 4</b> — délai de signature dépassé sur <b>12 demandes</b></li>
          </ul>
        </>
      }
      suggestions={[
        'Pourquoi le pic à la DGDI ?',
        'Notifie les responsables concernés',
        'Génère le rapport hebdomadaire',
        'Compare l\'usage de juin 2025 à juin 2024',
      ]}
      messages={[
        { role: 'user', text: 'Pourquoi le pic à la DGDI ?' },
        {
          role: 'assistant',
          text: <>La hausse correspond à <b>l'ouverture des inscriptions universitaires</b> (campagne du 18 / 05). Le nombre de demandes de CNI a triplé sur cette tranche horaire. Mêmes profils l'an dernier — pic absorbé en 4 jours.</>,
          sources: ['DGDI · file temps réel', 'historique 2024'],
          actions: [
            { label: 'Voir la file DGDI', icon: 'externalLink' },
            { label: 'Activer le mode renfort', icon: 'activity' },
          ],
        },
      ]}
      anchor={{ bottom: 28, right: 28 }}
      height={580}
    />
  </div>
);

/* ---------- Exports ---------- */
Object.assign(window, {
  AIGlyph, AssistantBubble, AssistantPanel, AssistantAudioPill, ContextChip,
  AssistantConcept, AssistantOnCitizenHome, AssistantChatOnCitizenWizard,
  AssistantAudioOnCitizenWizard, AssistantChatOnAdminInstruction,
  AssistantAudioOnAdminInstruction, AssistantChatOnPlatform,
});
