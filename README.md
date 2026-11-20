<div align="center">

# 🌱 ilo

### A calmer way to support student mental wellness

**ilo** is a student counselling and mental wellness platform designed for educational institutions—helping students connect with support, reflect on their feelings, and manage counselling sessions.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

[Live Website](https://github.com/DHIRGAYU/ilo) · [Report a Bug](https://github.com/DHIRGAYU/ilo/issues) · [Request a Feature](https://github.com/DHIRGAYU/ilo/issues)

</div>

---

## ✨ Why ilo?

Students should not have to navigate barriers when they need support. **ilo** brings counselling workflows and wellbeing tools into one welcoming, accessible platform.

- 🤝 **Connect with counsellors** through requests and booking
- 💬 **Continue conversations** through secure in-app messaging
- 🎥 **Meet through video calls** powered by Daily
- 🧘 **Reflect on feelings** and complete wellbeing self-checks
- 📚 **Explore learning resources** at a comfortable pace
- 🛡️ **Build trust** with privacy-conscious features and role-based experiences

## 🧭 Experiences

### For students

- Personalised home experience
- Feelings and emotional wellness tracking
- Guided self-checks
- Counsellor and session requests
- Session history and upcoming appointments
- Secure messages, profile, and preferences
- Learning resources

### For counsellors

- Dedicated counsellor workspace
- Student support workflows
- Request and session management
- Communication tools for ongoing care

### For institutions

- A public-facing overview of the platform
- A dedicated institutions page
- Privacy and terms resources
- A clear contact and support path

## 🔐 Privacy & Security

ilo is built around sensitive student wellbeing data, so privacy is a first-class concern:

- Authentication and application data are supported by **Supabase**
- Messaging and end-to-end-encryption components are included in the project
- Institutional setup and database migrations live in `supabase/`
- Visitors should review the repository's [Privacy Policy](/app/%28site%29/privacy-policy) and [Terms](/app/%28site%29/terms)

> If you deploy ilo, ensure your Supabase configuration, encryption keys, and environment secrets are handled securely. Never commit real credentials or service-role keys.

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org/) | App Router framework and server-rendered application |
| [React 19](https://react.dev/) | Interactive user interface |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe application code |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
| [Supabase](https://supabase.com/) | Authentication, PostgreSQL, and backend services |
| [Daily](https://www.daily.co/) | Video calling |
| [Lucide React](https://lucide.dev/) | Icons |
| [ONNX Runtime Web](https://onnxruntime.ai/) | Browser-based model support |

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project

### 1. Clone the repository

```bash
git clone https://github.com/DHIRGAYU/ilo.git
cd ilo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root. Add the variables required by your Supabase integration, for example:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Variable names may evolve as the application changes. Check `lib/`, `app/`, and Supabase-related code before deploying.

### 4. Set up the database

The repository includes SQL setup scripts and migrations under `supabase/`:

```text
supabase/
├── migrations/
└── setup_college.example.sql
```

Apply migrations and review `setup_college.example.sql` for example institutional configuration.

### 5. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run the configured lint checks |

## 🗂️ Project Structure

```text
ilo/
├── app/                    # Next.js App Router pages and API routes
│   ├── (site)/             # Public website pages
│   ├── (student)/          # Student experience
│   ├── (counsellor)/       # Counsellor workspace
│   └── api/                # Application API routes
├── components/             # Reusable and feature-specific UI components
│   ├── booking/            # Appointment booking
│   ├── call/               # Video calling
│   ├── chat/              # Messaging
│   ├── e2ee/               # End-to-end encryption
│   └── ui/                 # Shared UI primitives
├── lib/                    # Shared application utilities
├── model/                  # Application model resources
├── public/                 # Static assets
└── supabase/               # Database migrations and setup scripts
```

## 🤝 Contributing

Contributions are welcome. For a smooth review:

1. Fork the repository
2. Create a focused feature branch
3. Keep changes accessible, responsive, and privacy-conscious
4. Run `npm run lint` and `npm run build`
5. Open a pull request describing the problem and solution

Please avoid including personal or sensitive wellbeing data in issues, commits, tests, screenshots, or sample files.

## 🐛 Reporting Issues

Found a bug or have an idea? Open an issue with:

- A clear title and description
- Steps to reproduce
- Expected and actual behaviour
- Screenshots or recordings, if useful
- Any relevant browser or environment details

## ⚖️ Responsible Use

ilo is a supportive digital platform and should not replace professional, in-person mental healthcare or emergency services. Institutions deploying this project should provide clear access to qualified counsellors and urgent-support resources.

## 📄 License

The repository does not currently declare a license in the project files inspected. Please contact the repository owner before reusing or redistributing the project.

---

<div align="center">

Built with care for students and the people who support them. 💚

</div>
