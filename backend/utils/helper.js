// Response formatter utility
exports.success = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data
  };
};

exports.error = (error, statusCode = 500, message = 'Error') => {
  return {
    success: false,
    statusCode,
    message,
    error: error.message || error
  };
};

// Pagination helper
exports.paginate = (items, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    data: items.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total: items.length,
      pages: Math.ceil(items.length / limit)
    }
  };
};

// Sort helper
exports.sort = (items, sortBy = 'createdAt', order = 'desc') => {
  return items.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (typeof aValue === 'string') {
      return order === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return order === 'asc' ? aValue - bValue : bValue - aValue;
  });
};

// Filter helper
exports.filter = (items, filterBy = {}) => {
  return items.filter(item => {
    for (const [key, value] of Object.entries(filterBy)) {
      if (item[key] !== value) return false;
    }
    return true;
  });
};

// Search helper
exports.search = (items, searchTerm, searchFields = ['name']) => {
  if (!searchTerm) return items;

  const term = searchTerm.toLowerCase();
  return items.filter(item => {
    return searchFields.some(field => {
      const value = item[field];
      return value && value.toLowerCase().includes(term);
    });
  });
};

// Calculate total price with profit
exports.calculateTotalWithProfit = (basePrice, profitPercentage) => {
  return basePrice + (basePrice * (profitPercentage / 100));
};

// Format currency
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

// Validate email
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Indonesia)
exports.isValidPhoneNumber = (phone) => {
  const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
  return phoneRegex.test(phone);
};

// Generate ID
exports.generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
