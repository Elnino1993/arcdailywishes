import { Card, CardContent } from '@/components/ui/card'
import { Wallet, PenTool, Sparkles } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      icon: Wallet,
      title: 'Connect to Arc Testnet',
      description: 'Link your Web3 wallet and switch to Arc Testnet network',
    },
    {
      icon: PenTool,
      title: 'Write your wish',
      description: 'Express your daily intention in 300 characters or less',
    },
    {
      icon: Sparkles,
      title: 'Mint your daily NFT',
      description: 'Create an onchain memory that lives in your wallet forever',
    },
  ]

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">How It Works</h3>
        <p className="mt-2 text-gray-600">Three simple steps to mint your daily wish</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <Card
              key={index}
              className="border-rose-200 bg-white/80 backdrop-blur-sm transition-all hover:scale-[1.02]"
            >
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-400">
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h4 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h4>
                <p className="text-sm leading-relaxed text-gray-600">{step.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50">
        <CardContent className="p-8 text-center">
          <h4 className="text-lg font-semibold text-gray-900">Build Your Streak</h4>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Come back every day to mint a new wish and build your onchain streak. Each consecutive
            day adds to your collection and creates a meaningful journal of your journey.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
