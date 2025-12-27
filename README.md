# Cartwise - Smart Recipe & Shopping List Manager

A modern recipe management webapp that allows users to save recipes, organize ingredients, and create smart shopping lists categorized by supermarket aisle.

## Features

- **AI-Powered Recipe Extraction**: Paste a URL or recipe text and AI automatically extracts ingredients and instructions
- **Recipe Book**: Save and organize all your favorite recipes by category
- **Smart Shopping Lists**: Select recipes and generate a shopping list automatically organized by supermarket aisle
- **Subscription Management**: $5/month subscription with 3-day free trial powered by Polar
- **Beautiful UI**: Minimal design with Anthropic-inspired aesthetics (serif fonts, rounded corners, light shadows)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database/Auth**: Supabase
- **Payments**: Polar
- **Styling**: Tailwind CSS
- **AI**: OpenAI API (GPT-4o-mini)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key
- Polar account (for subscriptions)

### Installation

1. Clone the repository:
```bash
cd Cartwise
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Polar (for subscriptions)
POLAR_API_KEY=polar_sk_your_secret_key
POLAR_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_POLAR_PRODUCT_ID=prod_your_product_id
```

For detailed Polar setup instructions, see [POLAR_SETUP.md](POLAR_SETUP.md).

4. Set up the database:

Run the SQL schema in your Supabase SQL Editor. The schema file is located at `supabase/schema.sql`.

5. Configure Supabase Authentication:

In your Supabase dashboard:
- Go to Authentication > URL Configuration
- Add `http://localhost:3000/auth/callback` to the Redirect URLs

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── auth/
│   ├── callback/route.ts       # Auth callback handler
│   ├── login/page.tsx          # Login page
│   ├── signup/page.tsx         # Signup page
│   └── subscribe/              # Subscription pages
│       ├── page.tsx            # Subscribe page
│       └── success/page.tsx    # Post-checkout success
├── dashboard/
│   └── page.tsx                # Main dashboard (recipes + shopping list)
├── recipe/
│   ├── new/page.tsx            # New recipe editor
│   └── [id]/
│       ├── page.tsx            # View recipe
│       └── edit/page.tsx       # Edit recipe
└── api/
    ├── extract-recipe/route.ts # OpenAI recipe extraction
    └── polar/                  # Polar subscription API
        ├── create-checkout/    # Checkout session creation
        └── webhook/            # Webhook handler

components/
└── ui/                         # Reusable UI components

lib/
├── supabase/                   # Supabase client configuration
├── openai.ts                   # OpenAI client and parsing functions
├── subscription.ts             # Subscription utility functions
└── types.ts                    # TypeScript type definitions
```

## Database Schema

- **recipes**: Main recipe data (title, description, category, etc.)
- **recipe_steps**: Cooking instructions with step numbers
- **recipe_ingredients**: Ingredients with quantity, unit, and aisle category
- **shopping_list**: User's shopping list items
- **subscriptions**: User subscription status and trial information

## Usage

1. **Sign up** for an account
2. **Verify your email** via the confirmation link
3. **Start your free trial** ($5/month after 3 days)
4. **Add recipes** by:
   - Pasting a recipe URL (the AI will extract the recipe)
   - Copying and pasting recipe text directly
5. **Review and edit** the extracted recipe data
6. **Save** recipes to your recipe book
7. **Select recipes** to add their ingredients to your shopping list
8. **Shop efficiently** with ingredients organized by supermarket aisle

## Documentation

- [POLAR_SETUP.md](POLAR_SETUP.md) - Complete guide for setting up Polar subscriptions
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical implementation details

## License

MIT
# cartwise
