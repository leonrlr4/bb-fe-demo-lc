import { Card } from './ui/card';
import { Dna, BarChart3, Repeat } from 'lucide-react';

interface QuickActionsProps {
  onActionClick: (action: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const actions = [
    {
      title: 'Count GC Reads',
      description: 'Count GC content in FASTA',
      icon: Dna,
      color: 'from-blue-600 to-blue-700',
      query: 'Count GC content in my FASTA file and generate a summary report'
    },
    {
      title: 'Longest Sequence',
      description: 'Find longest sequence',
      icon: BarChart3,
      color: 'from-orange-600 to-orange-700',
      query: 'Find the longest sequence in my FASTA file and show statistics'
    },
    {
      title: 'Reverse Complement',
      description: 'Reverse DNA sequences',
      icon: Repeat,
      color: 'from-green-600 to-green-700',
      query: 'Generate reverse complement of all DNA sequences in my file'
    }
  ];

  return (
    <div>
      <h3 className="text-slate-300 mb-3 text-sm">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <Card
            key={action.title}
            onClick={() => onActionClick(action.query)}
            className={`bg-gradient-to-br ${action.color} border-none p-4 cursor-pointer hover:scale-105 transition-transform`}
          >
            <div className="flex items-start gap-3">
              <action.icon className="w-5 h-5 text-white flex-shrink-0" />
              <div>
                <h4 className="text-white text-sm mb-1">{action.title}</h4>
                <p className="text-white/70 text-xs">{action.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
