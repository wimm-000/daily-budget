# Daily Budget

A simple app to manage your daily budget. Track your spending, stay within your limits, and build better financial habits.

## Features

<!-- TODO: Update with actual features -->
- Daily budget tracking
- Expense logging
- Budget overview and insights
- *More features coming soon...*

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- SQLite

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/daily-budget.git
cd daily-budget

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Push database schema
bun run db:push

# Start development server
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run test` | Run tests |
| `bun run db:studio` | Open Drizzle Studio |

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19)
- **Routing:** [TanStack Router](https://tanstack.com/router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [Drizzle ORM](https://orm.drizzle.team/) + SQLite
- **Forms:** [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev/)

## Project Structure

```
src/
├── components/      # Reusable UI components
├── db/              # Database schema and connection
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── routes/          # File-based routing
└── styles.css       # Global styles
```

## Roadmap

<!-- TODO: Update with actual roadmap -->
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

## Contributing

<!-- TODO: Add contribution guidelines -->
Contributions are welcome! Please open an issue or submit a pull request.

## License

<!-- TODO: Add license -->
MIT
