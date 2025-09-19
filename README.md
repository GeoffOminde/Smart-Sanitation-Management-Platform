# Smart Sanitation Management Platform

A comprehensive fleet management dashboard for mobile toilet rental companies operating across East Africa. This platform provides real-time monitoring, AI-powered insights, route optimization, booking management, and analytics for portable sanitation units.

### 🌱 How the Platform Strengthens SDG Impact
---
Directly: Provides reliable sanitation services (SDG 6, SDG 3).

Indirectly: Boosts economic activity, job creation, and sustainability (SDG 8, SDG 11, SDG 13).

Enabling: Creates tech and financial infrastructure for scaling (SDG 9, SDG 17).

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Dashboard Modules](#dashboard-modules)
- [API Integration](#api-integration)
- [Contributing](#contributing)
- [License](#license)

### ✨ Features
Core Functionality

- Unit Tracking → GPS + status of all mobile toilets in real time
- Booking Management → Handle event and corporate bookings
- Fleet Monitoring → Vehicle + driver tracking for servicing routes
- Route Optimization → AI-assisted service scheduling and shortest routes
- Analytics Dashboard → Utilization, service frequency, demand trends
- Payment Integration → M-Pesa & Paystack (for African markets)
- Notifications → Alerts for servicing needs, overuse, or low supplies
- Multilingual Support → English & Swahili UI
  
### 🤖 AI Features

This platform comes with lightweight, heuristic AI features designed to optimize sanitation management without heavy compute costs.

✅ Current AI Capabilities

**1. Predictive Maintenance**

- Ranks units by likelihood of needing servicing.

- Uses fill levels, battery status, and usage history.

**2. AI Route Optimization**

Dynamic reordering of service stops by urgency + proximity.

Reduces fuel costs and servicing delays.

**3. Demand Forecasting**

Forecasts peak demand using classical heuristics (moving averages & seasonal trends).

Suggests inventory scaling before high-usage events.

**4. Prescriptive Alerts**

Actionable insights (e.g., “Deploy 10 more units to Nairobi this weekend”).

**5. Rule-based Assistant (English & Swahili)**

Integrated chatbot that helps staff/customers:

- Book units
- Check prices
- Request servicing
- Answer FAQs
- Smart Booking Suggestions
- Suggests alternative dates, unit availability, and pricing adjustments.
- Integrated into the Bookings dashboard.

### Technical Features
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates** - Live status monitoring and notifications
- **Search & Filtering** - Advanced search capabilities across all modules
- **Data Visualization** - Charts and graphs for business insights
- **Professional UI** - Modern, clean interface with intuitive navigation

## 🛠 Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Development**: ESLint, TypeScript compiler
- **Deployment**: Netlify / Vercel / static hosting

## 📁 Project Structure

```
smart-sanitation-platform/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   └── Dashboard.tsx          # Main dashboard component
│   ├── App.tsx                    # Root application component
│   ├── main.tsx                   # Application entry point
│   ├── index.css                  # Global styles with Tailwind
│   └── vite-env.d.ts             # Vite type definitions
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.app.json             # App-specific TypeScript config
├── tsconfig.node.json            # Node-specific TypeScript config
├── vite.config.ts                # Vite configuration
├── postcss.config.js             # PostCSS configuration
├── eslint.config.js              # ESLint configuration
└── README.md                     # Project documentation
```

## 🚀 Installation

### Prerequisites
- Node.js (version 18 or higher)
- npm or yarn package manager

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-sanitation-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to view the application

## 📖 Usage

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```


### 🔑 Sample Admin Login Credentials
Username / Email: Admin
Password: Admin



### Environment Setup

The application runs entirely in the browser with mock data. 

## 🎛 Dashboard Modules

### 1. Overview Dashboard
- **Fleet Statistics**: Total units, active routes, daily revenue, utilization rates
- **Urgent Alerts**: High-priority notifications for maintenance and servicing
- **Fleet Status**: Real-time status of all portable toilet units
- **Quick Actions**: Direct access to common operations

### 2. Fleet Map
- **Interactive Map**: Visual representation of all unit locations
- **Status Indicators**: Color-coded markers for unit status (Active, Maintenance, Offline)
- **Filtering Options**: Filter units by status, location, or other criteria
- **Real-time Updates**: Live position and status updates

### 3. Routes Management
- **Active Routes**: Current technician assignments and progress
- **Route Optimizer**: Intelligent routing based on priority and location
- **Technician Tracking**: Monitor field staff and their assigned routes
- **Time Estimation**: Accurate completion time predictions

### 4. Bookings Management
- **Customer Bookings**: Complete booking lifecycle management
- **Payment Tracking**: Integration with M-Pesa and other payment systems
- **Search & Filter**: Advanced search capabilities
- **Booking Analytics**: Revenue and booking trend analysis

### 5. Maintenance Scheduling
- **Preventive Maintenance**: Scheduled maintenance planning
- **Priority Management**: Urgent, scheduled, and completed maintenance
- **Parts Inventory**: Track spare parts and supplies
- **Technician Assignment**: Assign maintenance tasks to field staff

### 6. Analytics & Reporting
- **Revenue Analytics**: Monthly revenue trends and growth metrics
- **Utilization Metrics**: Unit utilization rates and efficiency
- **Performance Indicators**: Key business metrics and KPIs
- **Custom Reports**: Generate detailed business reports

### 7. Settings & Administration
- **Company Settings**: Business information and configuration
- **Team Management**: Staff management with role-based access
- **API Integrations**: M-Pesa, WhatsApp Business, and other integrations
- **Notification Preferences**: Email and WhatsApp alert settings
- **Security Settings**: Two-factor authentication and session management

## 🔌 API Integration

The platform is designed to integrate with various East African services:

### Payment Systems
- **M-Pesa Integration**: Mobile money payments
- **Bank Transfers**: Traditional banking integration
- **Credit Card Processing**: International payment support

### Communication
- **WhatsApp Business API**: Customer notifications and support
- **SMS Gateway**: Backup communication channel
- **Email Notifications**: Automated alerts and reports

### Mapping & Location
- **Google Maps API**: Route optimization and location services
- **Local Mapping Services**: Integration with regional mapping providers

## 🎨 Design System

### Color Scheme
- **Primary**: Blue (#2563EB) - Navigation and primary actions
- **Success**: Green (#059669) - Active status and positive metrics
- **Warning**: Yellow (#D97706) - Maintenance and attention required
- **Error**: Red (#DC2626) - Offline status and critical alerts
- **Neutral**: Gray (#6B7280) - Text and secondary elements

### Typography
- **Headings**: Inter font family, various weights
- **Body Text**: System font stack for optimal readability
- **Code**: Monospace font for technical elements

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🧪 Testing

The application includes comprehensive testing for:
- Component functionality
- User interactions
- Responsive design
- Cross-browser compatibility

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Platforms
- **Netlify / Bolt**: Automated deployment option
- **Vercel**: Alternative deployment option
- **AWS S3 + CloudFront**: Enterprise deployment option

## 📱 Mobile Optimization

The platform is fully optimized for mobile devices:
- Touch-friendly interface elements
- Responsive navigation
- Optimized data tables for small screens
- Mobile-first design approach

## 🔒 Security Features

- **Role-based Access Control**: Different permission levels for staff
- **Session Management**: Automatic logout and session timeout
- **Data Encryption**: Secure data transmission
- **API Security**: Secure integration with third-party services

## 🌍 Localization

The platform supports:
- **English**: Primary language
- **Swahili**: Regional language support
- **Currency**: Kenyan Shilling (KSh) with multi-currency support

## 📊 Performance

- **Fast Loading**: Optimized bundle size and lazy loading
- **Efficient Rendering**: React optimization techniques
- **Caching**: Browser caching for improved performance
- **SEO Optimized**: Meta tags and semantic HTML

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- **Email**: support@smartsanitation.co.ke
- **Phone**: +254 718 210 289


## 🗺 Roadmap

### Upcoming Features
- [ ] Mobile app for field technicians
- [ ] Advanced analytics with AI insights
- [ ] Multi-language support
- [ ] Offline mode capabilities
- [ ] Integration with IoT sensors
- [ ] Customer self-service portal



### Version History
---
- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Enhanced mobile responsiveness
- **v1.2.0** - Advanced analytics and reporting


---
**Built with ❤️ for the East African sanitation industry**
