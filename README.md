# Daily Budget

A simple app to manage your daily budget. Track your spending, stay within your limits, and build better financial habits.

## Features

<!-- TODO: Update with actual features -->
- Daily budget tracking
- Expense logging
- Budget overview and insights
- Admin panel for user management
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
```

### Database Setup

```bash
# Copy environment variables
cp .env.example .env.local

# Create database and apply schema
bun run db:push

# Seed database with default admin user
bun run db:seed
```

This creates a default admin account:
- **Email:** `admin@dailybudget.local`
- **Password:** `admin123`

> **Important:** Change the admin password after first login!

### Start Development Server

```bash
bun run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run test` | Run tests |
| `bun run db:push` | Push schema changes to database |
| `bun run db:seed` | Seed database with default data |
| `bun run db:studio` | Open Drizzle Studio UI |
| `bun run db:generate` | Generate database migrations |
| `bun run db:migrate` | Apply database migrations |

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19)
- **Routing:** [TanStack Router](https://tanstack.com/router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [Drizzle ORM](https://orm.drizzle.team/) + SQLite
- **Forms:** [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev/)
- **Auth:** bcrypt for password hashing

## Project Structure

```
src/
├── components/      # Reusable UI components
├── db/              # Database schema, connection, and seeds
│   ├── index.ts     # Database connection
│   ├── schema.ts    # Table definitions
│   └── seed.ts      # Database seeding script
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
│   ├── utils.ts     # General utilities (cn, etc.)
│   └── auth.ts      # Authentication helpers
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
