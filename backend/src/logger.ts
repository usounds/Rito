import { pino } from 'pino'; // 名前付きエクスポート

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            colorize: true, // 色付け
            translateTime: 'yyyy-mm-dd HH:MM:ss.l', // 日付と時間を表示
          },
        },
      ],
    },
  });

export default logger;