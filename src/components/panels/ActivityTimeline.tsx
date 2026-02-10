'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Terminal, 
  FileCode, 
  GitBranch, 
  AlertCircle, 
  CheckCircle,
  Trash2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { useActivityStore } from '@/stores';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const iconMap = {
  command: <Terminal size={14} />,
  file: <FileCode size={14} />,
  git: <GitBranch size={14} />,
  error: <AlertCircle size={14} />,
  success: <CheckCircle size={14} />,
};

const colorMap = {
  command: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  file: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  git: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export function ActivityTimeline() {
  const { activities, clearActivities } = useActivityStore();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-violet-400" />
          <CardTitle>Activity Timeline</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={clearActivities}>
          <Trash2 size={16} />
        </Button>
      </CardHeader>

      {/* Timeline */}
      <div className="flex-1 overflow-auto mt-4">
        {activities.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600">
            <div className="text-center">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
              <p className="text-xs mt-1">Your actions will appear here</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />

            <AnimatePresence initial={false}>
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="relative pl-10 pb-6 last:pb-0"
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute left-2 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center',
                    colorMap[activity.type]
                  )}>
                    {iconMap[activity.type]}
                  </div>

                  {/* Content */}
                  <div className="group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">
                          {activity.description}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-600 shrink-0">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Activity Stats */}
      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-zinc-900/50 rounded-lg">
              <p className="text-lg font-bold text-zinc-100">
                {activities.filter(a => a.type === 'command').length}
              </p>
              <p className="text-xs text-zinc-500">Commands</p>
            </div>
            <div className="p-2 bg-zinc-900/50 rounded-lg">
              <p className="text-lg font-bold text-emerald-400">
                {activities.filter(a => a.type === 'success').length}
              </p>
              <p className="text-xs text-zinc-500">Success</p>
            </div>
            <div className="p-2 bg-zinc-900/50 rounded-lg">
              <p className="text-lg font-bold text-red-400">
                {activities.filter(a => a.type === 'error').length}
              </p>
              <p className="text-xs text-zinc-500">Errors</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
