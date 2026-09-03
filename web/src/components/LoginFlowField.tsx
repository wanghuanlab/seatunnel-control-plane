export function LoginFlowField() {
  return (
    <div className="login-flow" aria-hidden="true">
      <div className="login-flow-wash" />
      <div className="login-flow-grid" />
      <svg className="login-flow-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="login-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--login-line-a)" />
            <stop offset="100%" stopColor="var(--login-line-b)" />
          </linearGradient>
        </defs>
        <g className="login-flow-paths" fill="none" stroke="url(#login-stroke)" strokeLinecap="round">
          <path d="M-40 210 C 220 80, 420 340, 720 250 S 1180 80, 1480 230" />
          <path d="M-60 430 C 180 520, 460 280, 760 470 S 1220 620, 1500 410" />
          <path d="M-30 680 C 260 560, 540 790, 880 640 S 1240 490, 1480 720" />
          <path d="M120 -20 C 300 180, 240 420, 510 390 S 900 220, 980 620 S 1280 860, 1460 740" />
        </g>
        <g className="login-flow-packets" fill="var(--login-packet)">
          <circle r="4.2">
            <animateMotion dur="14s" repeatCount="indefinite" path="M-40 210 C 220 80, 420 340, 720 250 S 1180 80, 1480 230" />
          </circle>
          <circle r="3.4">
            <animateMotion dur="18s" begin="-6s" repeatCount="indefinite" path="M-60 430 C 180 520, 460 280, 760 470 S 1220 620, 1500 410" />
          </circle>
          <circle r="3">
            <animateMotion dur="16s" begin="-3s" repeatCount="indefinite" path="M-30 680 C 260 560, 540 790, 880 640 S 1240 490, 1480 720" />
          </circle>
        </g>
      </svg>
      <div className="login-flow-orb login-flow-orb-a" />
      <div className="login-flow-orb login-flow-orb-b" />
      <div className="login-flow-grain" />
    </div>
  )
}
