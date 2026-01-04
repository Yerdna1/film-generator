
  I've analyzed your codebase and found several optimization opportunities. Here are the key issues:

  🔴 Critical Issues

  | Issue                            | Location              | Impact                                                                  |
  |----------------------------------|-----------------------|-------------------------------------------------------------------------|
  | Image optimization disabled      | next.config.ts:20     | unoptimized: true bypasses Next.js image optimization, +30% bundle size |
  | Store re-renders all subscribers | scene-slice.ts:81-101 | Single scene update re-renders ALL components subscribed to store       |

  🟠 High Priority

  | Issue                     | Location                   | Fix                                                                                      |
  |---------------------------|----------------------------|------------------------------------------------------------------------------------------|
  | Missing memoization       | 11/80+ components use memo | Add React.memo() to SceneCard, CharacterCard, Step components                            |
  | Heavy eager imports       | package.json               | Lazy-load Polar SDK (~37MB), effect (~33MB), OpenTelemetry (~44MB)                       |
  | Missing DB indexes        | schema.prisma              | Add composite indexes for Scene(projectId, number), CreditTransaction(userId, createdAt) |
  | Expensive memo comparison | SceneCard.tsx:565-593      | 20+ prop comparisons defeats memoization benefit                                         |

  🟡 Medium Priority

  | Issue                       | Location             | Fix                                                      |
  |-----------------------------|----------------------|----------------------------------------------------------|
  | Sequential image processing | image/route.ts:45-80 | Use Promise.all() for reference images                   |
  | Cache key mismatch          | cache.ts             | Normalize cache keys for query params (?includeDialogue) |
  | Sequential Inngest jobs     | generate-images.ts   | Pre-fetch character images before batch                  |

  Quick Wins

  1. Enable image optimization:
  // next.config.ts - remove this line
  unoptimized: true,
  2. Add Zustand selectors:
  // Instead of:
  const { projects } = useProjectStore()

  // Use:
  const scenes = useProjectStore(state =>
    state.currentProject?.scenes
  )
  3. Dynamic imports for heavy SDKs:
  // Only load Polar on billing pages
  const PolarSDK = dynamic(() => import('@polar-sh/sdk'))
  4. Add missing indexes to prisma/schema.prisma:
  model Scene {
    @@index([projectId, number])
  }
  model CreditTransaction {
    @@index([userId, createdAt(sort: Desc)])
  }

  Would you like me to implement any of these optimizations?