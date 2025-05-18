// Constantes de conversion temps
const MS_PER_DAY = 24 * 60 * 60 * 1000;       // Nombre de millisecondes dans un jour
const MS_PER_WEEK = 7 * MS_PER_DAY;           // Nombre de millisecondes dans une semaine

// convertTimestamp : convertit un timestamp en Date
const convertTimestamp = (timestamp) => {
  const ts = Number(timestamp);
  return new Date(ts * 1000);
};

// Trouve et log toutes les périodes pour un modèle donné
const findPeriods = (messages, periodInDays, modelName) => {
  const sortedMessages = [...messages].sort((a, b) => 
    convertTimestamp(a.create_time).getTime() - convertTimestamp(b.create_time).getTime()
  );

  if (sortedMessages.length === 0) {
    return {
      periods: [],
      currentPeriod: null
    };
  }

  const periods = [];
  let currentPeriod = null;
  const periodDuration = periodInDays * MS_PER_DAY;
  
  sortedMessages.forEach((message, index) => {
    const messageDate = convertTimestamp(message.create_time);

    if (!currentPeriod || messageDate.getTime() > currentPeriod.endDate.getTime()) {
      if (currentPeriod) {
        periods.push(currentPeriod);
      }

      currentPeriod = {
        type: 'active',
        startDate: messageDate,
        endDate: new Date(messageDate.getTime() + periodDuration),
        messages: [message],
        number: periods.length + 1
      };
    } else {
      currentPeriod.messages.push(message);
    }
  });

  if (currentPeriod) {
    periods.push(currentPeriod);
  }

  return {
    periods,
    currentPeriod
  };
};

export const calculateQuotas = (conversations) => {
  if (!conversations || conversations.length === 0) {
    return {
      o1: { used: 0, remaining: 50, resetDate: null, isReset: true },
      o1mini: { used: 0, remaining: 50, resetDate: null, isReset: true }
    };
  }

  const now = new Date();
  
  const allMessages = conversations.flatMap(conversation => {
    const messages = (conversation.messages || []).filter(msg => 
      msg.role === 'assistant' && 
      (msg.model_slug === 'o1' || msg.model_slug === 'o1-mini')
    );
    return messages;
  });

  const o1Messages = allMessages.filter(msg => msg.model_slug === 'o1');
  const o1MiniMessages = allMessages.filter(msg => msg.model_slug === 'o1-mini');

  const calculateModelQuota = (modelMessages, resetPeriodDays, modelName) => {
    const { periods, currentPeriod } = findPeriods(modelMessages, resetPeriodDays, modelName);
    
    if (periods.length === 0) {
      return {
        used: 0,
        remaining: 50,
        resetDate: null,
        isReset: true
      };
    }

    const lastPeriod = periods[periods.length - 1];
    const now = new Date();

    if (now > lastPeriod.endDate) {
      return {
        used: 0,
        remaining: 50,
        resetDate: null,
        isReset: true
      };
    }

    const used = lastPeriod.messages.length;
    const remaining = Math.max(0, 50 - used);

    return {
      used,
      remaining,
      resetDate: lastPeriod.endDate,
      isReset: false
    };
  };

  const result = {
    o1: calculateModelQuota(o1Messages, 7, 'o1'),
    o1mini: calculateModelQuota(o1MiniMessages, 1, 'o1-mini')
  };
  
  return result;
};
