export interface DocArticle {
  slug: string;
  sectionId: string;
  title: string;
  prev?: { slug: string; sectionId: string; title: string };
  next?: { slug: string; sectionId: string; title: string };
  content: React.ReactNode;
}

export interface DocSection {
  id: string;
  title: string;
  articles: DocArticle[];
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-7 text-foreground">{children}</p>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mt-6 mb-2 text-foreground">{children}</h3>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside mb-4 space-y-1 text-foreground">{children}</ul>;
}
function LI({ children }: { children: React.ReactNode }) {
  return <li className="leading-7">{children}</li>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
}
function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted rounded-md p-4 mb-4 overflow-x-auto text-sm font-mono leading-6">
      {children}
    </pre>
  );
}
function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-100",
    warning:
      "bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-100",
    tip: "bg-green-50 border-green-300 text-green-900 dark:bg-green-950 dark:border-green-700 dark:text-green-100",
  };
  const labels = { info: "Note", warning: "Warning", tip: "Tip" };
  return (
    <div className={`border rounded-md p-4 mb-4 ${styles[type]}`}>
      <span className="font-semibold">{labels[type]}: </span>
      {children}
    </div>
  );
}

// Article bodies (no prev/next yet — set below)
type ArticleBody = Omit<DocArticle, "prev" | "next">;

const ARTICLE_BODIES: ArticleBody[] = [
  // ─── Create account ──────────────────────────────────────────────────────────
  {
    slug: "setup",
    sectionId: "create-account",
    title: "Creating Your Account",
    content: (
      <>
        <P>
          NistaGPS accounts are provisioned by your administrator or by contacting the NistaGPS
          support team. Self-registration is not available — this ensures your fleet data is always
          tied to a verified organisation.
        </P>
        <H2>What you need</H2>
        <UL>
          <LI>A mobile phone number registered with your organisation</LI>
          <LI>A temporary password provided by your administrator</LI>
          <LI>A modern web browser (Chrome, Firefox, Edge, or Safari)</LI>
        </UL>
        <H2>Logging in for the first time</H2>
        <P>
          Navigate to <Code>https://nistagps.com/login</Code> and enter your phone number and the
          temporary password. After a successful login you will be taken to the live tracking
          dashboard. We strongly recommend changing your password immediately via the{" "}
          <strong>Profile</strong> page.
        </P>
        <H2>Forgotten password</H2>
        <P>
          If you have lost access, contact your fleet administrator or reach out to NistaGPS
          support at <Code>support@nistagps.com</Code>. Administrators can reset passwords from
          Control Panel &rarr; User Management.
        </P>
        <Callout type="tip">
          Bookmark the login page so your team can always find it quickly, especially on mobile
          browsers.
        </Callout>
      </>
    ),
  },
  {
    slug: "quick-start",
    sectionId: "create-account",
    title: "Quick Start Guide",
    content: (
      <>
        <P>
          Get your first vehicle showing on the live map in under 10 minutes. Follow each step in
          order.
        </P>
        <H2>Step 1 — Add your vehicle</H2>
        <P>
          Go to <strong>Vehicles</strong> in the sidebar and click <strong>Add Vehicle</strong>.
          Fill in the name, registration plate, and IMEI number from your GPS tracker device. Save
          — the vehicle appears in the object list immediately.
        </P>
        <H2>Step 2 — Connect your GPS device</H2>
        <P>
          Power on your tracker and configure it to send data to the NistaGPS server. The server
          address is <Code>34.133.128.65</Code> and the TCP port depends on your device protocol:
        </P>
        <UL>
          <LI>GT06 / Concox devices — port <Code>5023</Code></LI>
          <LI>Other protocols — see the Supported Devices page</LI>
        </UL>
        <H2>Step 3 — Verify live data</H2>
        <P>
          Return to the <strong>Tracking</strong> map. Within a few minutes your vehicle icon
          should appear at its current location. If the icon does not appear, check the device
          power, SIM card data, and APN settings.
        </P>
        <H2>Step 4 — Set up alerts</H2>
        <P>
          Navigate to <strong>Alert Settings</strong> to configure speed alerts, geofence breach
          notifications, and ignition events. Alerts can be delivered via push notification or SMS.
        </P>
        <Callout type="tip">
          Your GPS device must have an active SIM card with a mobile data plan. NistaGPS does not
          provide SIM cards — check with your device supplier.
        </Callout>
      </>
    ),
  },

  // ─── Workspace ───────────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "workspace",
    title: "Workspace Overview",
    content: (
      <>
        <P>
          The NistaGPS workspace is the primary interface you see after logging in. It is built
          around a live map surrounded by panels and toolbars that give you access to every feature
          of the platform.
        </P>
        <H2>Main areas</H2>
        <UL>
          <LI>
            <strong>Top panel</strong> — toolbar with search, user account menu, and notification
            icons
          </LI>
          <LI>
            <strong>Left sidebar</strong> — object (vehicle) list, groups, and filters
          </LI>
          <LI>
            <strong>Map canvas</strong> — live GPS positions, trails, geofences, and markers
          </LI>
          <LI>
            <strong>Bottom panel</strong> — quick statistics, event log, and active alerts
          </LI>
        </UL>
        <H2>Switching modules</H2>
        <P>
          The main navigation sidebar gives you access to all platform modules: Tracking,
          Dashboard, History, Reports, Geofences, Routes, POIs, Vehicles, and more. Click any
          module name to switch to it immediately.
        </P>
        <Callout type="info">
          The workspace layout is responsive. On smaller screens the sidebar collapses into a
          slide-out menu opened with the hamburger icon in the top-left corner.
        </Callout>
      </>
    ),
  },
  {
    slug: "top-panel",
    sectionId: "workspace",
    title: "Top Panel",
    content: (
      <>
        <P>
          The top panel runs across the top of the workspace and provides quick access to global
          search, notifications, and your user account settings.
        </P>
        <H2>Search bar</H2>
        <P>
          Type a vehicle name, driver name, or address into the search bar to quickly locate an
          asset on the map. Results appear in a dropdown; clicking one centres the map on that
          object.
        </P>
        <H2>Notification bell</H2>
        <P>
          The bell icon shows the count of unread alerts. Click it to open the notification panel
          listing recent events such as speeding violations, geofence breaches, and low battery
          warnings. Clicking an event navigates to the relevant location on the map.
        </P>
        <H2>User menu</H2>
        <P>
          Click your name or avatar in the top-right corner to open the user menu. From here you
          can visit your Profile, switch the theme (light/dark), or log out. Administrators also
          see a link to the Control Panel.
        </P>
      </>
    ),
  },
  {
    slug: "side-panel",
    sectionId: "workspace",
    title: "Object List (Side Panel)",
    content: (
      <>
        <P>
          The side panel on the left contains the complete list of your vehicles (called{" "}
          <em>objects</em> in the platform). It is the primary way to select, filter, and interact
          with individual vehicles.
        </P>
        <H2>Vehicle list</H2>
        <P>
          Each vehicle is shown with its name, current status (moving, stopped, ignition off), and
          the time of its last GPS update. Vehicles are colour-coded: green for moving, orange for
          idling, grey for offline.
        </P>
        <H2>Filtering</H2>
        <P>
          Use the filter bar above the list to search by vehicle name. You can also filter by
          group using the Group selector at the top of the panel.
        </P>
        <H2>Selecting a vehicle</H2>
        <P>
          Click any vehicle to select it. The map pans to that vehicle and shows its information
          card (speed, heading, last update time, address). Right-click for a context menu with
          options such as Show History, Add Geofence, and Send Command.
        </P>
        <Callout type="info">
          Hold Shift and click to select multiple vehicles and compare them side by side on the
          map.
        </Callout>
      </>
    ),
  },
  {
    slug: "map",
    sectionId: "workspace",
    title: "Map Canvas",
    content: (
      <>
        <P>
          The map canvas is the central element of the workspace. It renders live GPS positions,
          historical trails, geofences, POIs, and routes on an interactive tile map.
        </P>
        <H2>Navigation</H2>
        <P>
          Use the scroll wheel to zoom in and out. Click and drag to pan. The map supports touch
          gestures on mobile and tablet devices. The <strong>Fit all</strong> button adjusts the
          zoom level to show all vehicles at once.
        </P>
        <H2>Map layers</H2>
        <P>
          NistaGPS supports multiple map tile providers. Switch between providers using the Layers
          icon in the bottom-right corner. Available options include road maps, satellite imagery,
          and hybrid views.
        </P>
        <H2>Vehicle markers</H2>
        <P>
          Each vehicle is represented by an icon showing its current heading. A colour ring
          indicates status: green (moving), orange (idling &gt;5 min), grey (offline &gt;1 hour).
          Click a marker to open its information popup.
        </P>
        <H2>Cluster mode</H2>
        <P>
          When many vehicles are close together, their markers merge into a cluster bubble showing
          the count. Zoom in or click the cluster to expand it and see individual vehicles.
        </P>
      </>
    ),
  },
  {
    slug: "bottom-panel",
    sectionId: "workspace",
    title: "Bottom Panel",
    content: (
      <>
        <P>
          The bottom panel displays a live summary of your fleet status and recent events. It can
          be expanded or collapsed using the arrow icon on its left edge.
        </P>
        <H2>Fleet summary</H2>
        <P>
          The top row shows at-a-glance counts: total vehicles, vehicles currently moving, vehicles
          stopped (ignition on), and vehicles offline. These numbers update automatically.
        </P>
        <H2>Event log</H2>
        <P>
          Below the summary is a scrollable list of recent events in chronological order. Each row
          shows the event type, vehicle name, and timestamp. Click any event to highlight that
          vehicle on the map and zoom to its location.
        </P>
        <H2>Active alerts</H2>
        <P>
          The alert tab shows active alert conditions — events triggered but not yet acknowledged.
          Click <strong>Acknowledge</strong> next to an alert to clear it from the active list.
        </P>
      </>
    ),
  },
  {
    slug: "user-account",
    sectionId: "workspace",
    title: "User Account Panel",
    content: (
      <>
        <P>
          The user account panel is accessible from the avatar/name in the top-right corner. It
          lets you manage your personal settings without navigating away from the tracking map.
        </P>
        <H2>Profile settings</H2>
        <P>
          Click <strong>Profile</strong> to open your profile page. Here you can update your
          display name, change your password, and set your preferred language. Changes take effect
          immediately.
        </P>
        <H2>Password change</H2>
        <P>
          Enter your current password followed by your new password (minimum 8 characters) and
          click <strong>Save</strong>. You remain logged in — the new password is required on your
          next login.
        </P>
        <H2>Theme preference</H2>
        <P>
          Toggle between light mode and dark mode using the sun/moon icon in the top panel. Your
          preference is saved in your browser and remembered across sessions.
        </P>
        <Callout type="warning">
          Administrators cannot view your password. If you forget it, an administrator must reset
          it from the Control Panel.
        </Callout>
      </>
    ),
  },
  {
    slug: "mobile-applications",
    sectionId: "workspace",
    title: "Mobile Applications",
    content: (
      <>
        <P>
          NistaGPS offers three companion mobile applications that extend the platform to your
          Android or iOS device, turning a smartphone into a GPS tracking device, a local server,
          or an SMS gateway.
        </P>
        <H2>GPS Server</H2>
        <P>
          Turns an Android phone into a local GPS tracking server that can receive data from
          multiple tracker devices over Wi-Fi or mobile data. Ideal for small fleets or offline
          environments. The app forwards data to the NistaGPS cloud server simultaneously.
        </P>
        <H2>GPS Tracker</H2>
        <P>
          Turns an Android or iOS smartphone into a GPS tracking device using the phone&apos;s
          built-in GPS. No dedicated hardware required. Location updates are sent to the NistaGPS
          server every 30 seconds by default. Available on Google Play and the App Store.
        </P>
        <H2>SMS Gateway</H2>
        <P>
          Routes NistaGPS alert SMS messages through a physical SIM card in an Android phone.
          Useful in regions where local SIM SMS rates are cheaper than cloud SMS API services. The
          phone must be online and the app running in the foreground.
        </P>
        <Callout type="tip">
          See the Mobile Apps pages on the NistaGPS marketing site for download links and detailed
          setup guides for each application.
        </Callout>
      </>
    ),
  },

  {
    slug: "gps-server-mobile",
    sectionId: "workspace",
    title: "GPS Server Mobile App",
    content: (
      <>
        <P>
          The GPS Server Android app turns a smartphone or tablet into a local tracking server.
          It receives GPS data from nearby tracker devices over a local Wi-Fi network or mobile
          hotspot and relays it to the NistaGPS cloud server.
        </P>
        <H2>Use case</H2>
        <P>
          Ideal for small fleets or remote sites where internet connectivity is intermittent. The
          local server buffers incoming GPS packets and forwards them in bulk when connectivity
          is restored.
        </P>
        <H2>Setup</H2>
        <UL>
          <LI>Download the app from Google Play Store on an Android device</LI>
          <LI>
            Open the app and enter your NistaGPS server address (<Code>34.133.128.65</Code>) and
            port (<Code>5023</Code>)
          </LI>
          <LI>Configure your GPS tracker devices to connect to the Android phone&apos;s local IP</LI>
          <LI>Start the server in the app — incoming connections are shown in real time</LI>
        </UL>
        <Callout type="tip">
          Keep the device plugged in and set &ldquo;Keep screen on while charging&rdquo; to
          prevent Android from killing the background server process.
        </Callout>
      </>
    ),
  },
  {
    slug: "gps-tracker-app",
    sectionId: "workspace",
    title: "GPS Tracker App",
    content: (
      <>
        <P>
          The GPS Tracker app turns any Android or iOS smartphone into a GPS tracking device
          that reports to NistaGPS. No dedicated hardware is required — just the app and a data
          plan.
        </P>
        <H2>Use case</H2>
        <P>
          Great for field staff, courier drivers, or personal vehicles where a hardwired tracker
          is not practical. The app sends the phone&apos;s GPS position to NistaGPS at a
          configurable interval.
        </P>
        <H2>Setup</H2>
        <UL>
          <LI>Download from Google Play (Android) or Apple App Store (iOS)</LI>
          <LI>Log in with your NistaGPS credentials</LI>
          <LI>The app will appear as a vehicle in your fleet automatically</LI>
          <LI>Set the tracking interval (30 s, 1 min, 5 min) and battery saving mode</LI>
        </UL>
        <H2>Battery impact</H2>
        <P>
          Continuous GPS tracking drains battery faster. Enable battery-saving mode to reduce GPS
          accuracy slightly in exchange for significantly lower power consumption. The app also
          supports track-on-motion (only sends updates when the phone is moving).
        </P>
      </>
    ),
  },
  {
    slug: "map-controls",
    sectionId: "workspace",
    title: "Map Controls",
    content: (
      <>
        <P>
          The map canvas has a set of built-in controls that let you interact with the live view,
          change tile layers, and access quick tools without leaving the tracking screen.
        </P>
        <H2>Zoom controls</H2>
        <P>
          Use the <strong>+</strong> and <strong>&minus;</strong> buttons in the bottom-right corner
          to zoom in and out. Alternatively, scroll the mouse wheel or use a pinch gesture on
          touch devices. Double-clicking the map also zooms in by one level.
        </P>
        <H2>Fit all</H2>
        <P>
          The <strong>Fit All</strong> button (square icon in the toolbar) adjusts the zoom and
          pan automatically to show all visible vehicles at once. Useful when a vehicle has
          driven far from the current view.
        </P>
        <H2>Tile layer switcher</H2>
        <P>
          Click the <strong>Layers</strong> icon to open the tile layer selector. Available
          layers include road map, satellite imagery, terrain, and hybrid. The selected layer is
          remembered per user session.
        </P>
        <H2>Drawing tools</H2>
        <P>
          The drawing toolbar (pencil icon) provides tools for creating geofences, routes, and
          POIs directly on the map without navigating to a separate module. Select a shape
          (circle, rectangle, polygon) and click on the map to draw.
        </P>
        <H2>Ruler / distance tool</H2>
        <P>
          The ruler tool measures the straight-line distance between two or more points on the
          map. Click to place measurement points; the total distance is shown in the toolbar.
          Useful for estimating route lengths before assigning them to vehicles.
        </P>
      </>
    ),
  },

  // ─── Control panel ───────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "control-panel",
    title: "Control Panel Overview",
    content: (
      <>
        <P>
          The Control Panel is the administrative hub of NistaGPS, accessible only to users with
          the <strong>admin</strong> role. Reach it via the top-right user menu or by navigating
          to <Code>/admin-settings</Code>.
        </P>
        <H2>Available sections</H2>
        <UL>
          <LI>
            <strong>Server Settings</strong> — server name, timezone, and global defaults
          </LI>
          <LI>
            <strong>User Management</strong> — create, edit, and deactivate user accounts
          </LI>
          <LI>
            <strong>Billing</strong> — manage subscription plans and vehicle activation
          </LI>
          <LI>
            <strong>Branding</strong> — company logo, colour scheme, and custom domain
          </LI>
          <LI>
            <strong>Maps</strong> — configure default map tile provider and API keys
          </LI>
          <LI>
            <strong>Email &amp; SMS</strong> — SMTP and SMS gateway settings for alert delivery
          </LI>
          <LI>
            <strong>API Access</strong> — generate and revoke API keys for third-party integrations
          </LI>
          <LI>
            <strong>Logs</strong> — audit trail of admin actions and system events
          </LI>
        </UL>
        <Callout type="warning">
          Changes in the Control Panel affect all users in your organisation. Always review
          carefully before saving.
        </Callout>
      </>
    ),
  },
  {
    slug: "server",
    sectionId: "control-panel",
    title: "Server Settings",
    content: (
      <>
        <P>
          Server settings control the global configuration of your NistaGPS instance, including
          the server name shown to users, default timezone, and data retention policies.
        </P>
        <H2>Server name</H2>
        <P>
          The server name appears in the browser title bar, email notifications, and exported
          reports. Set it to your company name or fleet name for a professional appearance.
        </P>
        <H2>Timezone</H2>
        <P>
          All timestamps — GPS events, reports, history — are displayed in the timezone set here.
          Choose the timezone that matches your primary fleet operations region. Users can override
          this individually from their Profile page.
        </P>
        <H2>Data retention</H2>
        <P>
          By default, GPS location history is stored for 90 days. Contact NistaGPS support to
          discuss extended retention options for compliance or regulatory requirements.
        </P>
      </>
    ),
  },
  {
    slug: "user-management",
    sectionId: "control-panel",
    title: "User Management",
    content: (
      <>
        <P>
          User Management lets administrators create accounts for fleet operators, dispatchers, and
          viewers. Each account has a role and configurable module permissions.
        </P>
        <H2>Creating a user</H2>
        <P>
          Click <strong>Add User</strong> and fill in the phone number, display name, and
          temporary password. Select the user role:
        </P>
        <UL>
          <LI>
            <strong>Admin</strong> — full access to all modules and the Control Panel
          </LI>
          <LI>
            <strong>Manager</strong> — access to all tracking modules but not the Control Panel
          </LI>
          <LI>
            <strong>Viewer</strong> — read-only access; cannot change vehicle settings or send
            commands
          </LI>
        </UL>
        <H2>Module permissions</H2>
        <P>
          For Manager and Viewer roles, you can restrict which modules are visible in the sidebar.
          Un-check modules the user should not access. The vehicle list is always visible for all
          roles.
        </P>
        <H2>Deactivating a user</H2>
        <P>
          Deactivated users cannot log in but their account data is preserved. This is preferable
          to deletion when an employee leaves but you may need to audit their historical activity.
        </P>
      </>
    ),
  },
  {
    slug: "billing",
    sectionId: "control-panel",
    title: "Billing & Subscriptions",
    content: (
      <>
        <P>
          NistaGPS billing is vehicle-based — you pay per activated vehicle per billing cycle. The
          Billing section shows your current plan, active vehicle count, and payment history.
        </P>
        <H2>Activating a vehicle</H2>
        <P>
          Newly added vehicles are inactive by default. To activate, go to{" "}
          <strong>Billing &rarr; Activate Vehicles</strong>, select the vehicles, and complete
          payment via Razorpay. Activated vehicles count towards your monthly bill from that day.
        </P>
        <H2>Subscription plans</H2>
        <UL>
          <LI>
            <strong>Basic</strong> — live tracking, 30-day history, standard alerts
          </LI>
          <LI>
            <strong>Standard</strong> — everything in Basic plus reports, driver management, and
            90-day history
          </LI>
          <LI>
            <strong>Premium</strong> — everything in Standard plus advanced analytics, API access,
            and 1-year history
          </LI>
        </UL>
        <H2>Invoices</H2>
        <P>
          Invoices are automatically generated at the end of each billing period and emailed to
          the admin account. Download them from <strong>Billing &rarr; Invoice History</strong>{" "}
          for accounting purposes.
        </P>
        <Callout type="info">
          Vehicle activation is prorated — if you activate mid-month, you only pay for the
          remaining days in the billing cycle.
        </Callout>
      </>
    ),
  },
  {
    slug: "branding",
    sectionId: "control-panel",
    title: "Branding",
    content: (
      <>
        <P>
          The Branding section lets you customise the visual identity of your NistaGPS instance to
          match your company branding. Changes apply to all users in your organisation.
        </P>
        <H2>Logo</H2>
        <P>
          Upload a PNG or SVG logo (recommended: 200×50 px, transparent background). The logo
          appears in the top-left corner of the application and in exported PDF reports.
        </P>
        <H2>Colour scheme</H2>
        <P>
          Set a primary brand colour. This colour is used for buttons, active states, and accents
          throughout the interface, in both light and dark mode.
        </P>
        <H2>Custom domain</H2>
        <P>
          For self-hosted instances, configure a custom domain. Point your DNS A record to the
          server IP and set the domain here. NistaGPS will serve the application at your custom
          domain with a valid SSL certificate.
        </P>
      </>
    ),
  },
  {
    slug: "maps",
    sectionId: "control-panel",
    title: "Map Configuration",
    content: (
      <>
        <P>
          The Maps section lets administrators configure which map tile providers are available to
          users and set a default provider for the workspace.
        </P>
        <H2>Map providers</H2>
        <UL>
          <LI>
            <strong>Google Maps</strong> — requires a Google Maps API key with Maps JavaScript API
            enabled
          </LI>
          <LI>
            <strong>OpenStreetMap</strong> — free, no API key required
          </LI>
          <LI>
            <strong>Mapbox</strong> — requires a Mapbox access token; offers high-quality street
            and satellite layers
          </LI>
          <LI>
            <strong>Bing Maps</strong> — requires a Bing Maps API key
          </LI>
        </UL>
        <H2>Default provider</H2>
        <P>
          Set the default map provider that users see when they first open the workspace. Users can
          switch providers themselves using the Layers icon on the map canvas.
        </P>
        <H2>API key storage</H2>
        <P>
          Map API keys are stored encrypted in the server database. They are never exposed to
          frontend clients directly — the server proxies tile requests where required.
        </P>
        <Callout type="warning">
          Ensure your map API key has usage restrictions (HTTP referrer or IP allowlist) to prevent
          unauthorised use and unexpected billing from your map provider.
        </Callout>
      </>
    ),
  },
  {
    slug: "email-sms",
    sectionId: "control-panel",
    title: "Email & SMS Configuration",
    content: (
      <>
        <P>
          Configure outbound email and SMS providers so NistaGPS can deliver alert notifications
          and scheduled reports to your team.
        </P>
        <H2>Email (SMTP)</H2>
        <P>
          Enter your SMTP server details: host, port (typically 587 for TLS), username, and
          password. Test the configuration with the <strong>Send Test Email</strong> button.
        </P>
        <H2>SMS gateway</H2>
        <P>
          NistaGPS supports SMS delivery via the GPS Tracker mobile app (SMS gateway mode) or a
          third-party API such as Twilio or MSG91. Enter your gateway credentials and sender ID.
        </P>
        <H2>Alert templates</H2>
        <P>
          Customise the text content of email and SMS alerts in the{" "}
          <strong>Templates</strong> section. Use placeholder variables like{" "}
          <Code>{"{vehicle_name}"}</Code>, <Code>{"{speed}"}</Code>, and{" "}
          <Code>{"{location}"}</Code> which are replaced with real values when the alert fires.
        </P>
      </>
    ),
  },
  {
    slug: "api",
    sectionId: "control-panel",
    title: "API Access",
    content: (
      <>
        <P>
          NistaGPS provides a REST API for integrating fleet data into your own systems,
          dashboards, or third-party logistics software. API keys are managed in{" "}
          <strong>Control Panel &rarr; API Access</strong>.
        </P>
        <H2>Generating an API key</H2>
        <P>
          Click <strong>Generate Key</strong> to create a new API token. Give it a descriptive
          name. The key is shown once — copy it immediately and store it securely.
        </P>
        <H2>Making requests</H2>
        <P>
          Include your API key in the <Code>Authorization</Code> header of every request:
        </P>
        <Pre>Authorization: Bearer YOUR_API_KEY</Pre>
        <H2>Available endpoints</H2>
        <UL>
          <LI>
            <Code>GET /api/vehicles</Code> — list all vehicles with their current status
          </LI>
          <LI>
            <Code>GET /api/vehicles/:id/history</Code> — GPS history for a vehicle
          </LI>
          <LI>
            <Code>GET /api/events</Code> — recent alert events
          </LI>
          <LI>
            <Code>GET /api/reports/summary</Code> — fleet summary statistics
          </LI>
        </UL>
        <Callout type="warning">
          API keys grant full read access to your fleet data. Never expose them in client-side
          code or public repositories.
        </Callout>
      </>
    ),
  },
  {
    slug: "logs",
    sectionId: "control-panel",
    title: "Audit Logs",
    content: (
      <>
        <P>
          The Audit Logs section records all significant administrative actions taken in the
          Control Panel. Use logs to track changes, investigate issues, and meet compliance
          requirements.
        </P>
        <H2>What is logged</H2>
        <UL>
          <LI>User account creation, modification, and deactivation</LI>
          <LI>Vehicle add, edit, and delete operations</LI>
          <LI>Billing activations and payment events</LI>
          <LI>Control Panel configuration changes (settings, branding, API keys)</LI>
          <LI>Login attempts (successful and failed)</LI>
        </UL>
        <H2>Searching logs</H2>
        <P>
          Use the date range and search filters to narrow down the log list. You can filter by
          user, action type, or keyword. Logs are presented in reverse chronological order.
        </P>
        <H2>Exporting logs</H2>
        <P>
          Click <strong>Export CSV</strong> to download the current filtered log view. This is
          useful for compliance audits or when sharing activity records with your security team.
        </P>
      </>
    ),
  },
  {
    slug: "languages",
    sectionId: "control-panel",
    title: "Languages & Localisation",
    content: (
      <>
        <P>
          NistaGPS supports multiple interface languages. Administrators can set the default
          language for the organisation, and individual users can override this in their Profile.
        </P>
        <H2>Setting the default language</H2>
        <P>
          Go to <strong>Control Panel &rarr; Languages</strong> and select the organisation-wide
          default language from the dropdown. Currently supported languages include English, Hindi,
          Tamil, Telugu, and Arabic.
        </P>
        <H2>User-level override</H2>
        <P>
          Each user can set their own preferred language from their Profile page. The user-level
          setting overrides the organisation default for that user only. Other users are not
          affected.
        </P>
        <H2>Date, time, and unit formats</H2>
        <P>
          Localisation also controls the date format (DD/MM/YYYY vs MM/DD/YYYY), time format
          (12-hour vs 24-hour), and unit system (metric km/km/h vs imperial miles/mph). These can
          be configured independently of the interface language.
        </P>
      </>
    ),
  },
  {
    slug: "cp-templates",
    sectionId: "control-panel",
    title: "Templates (Admin)",
    content: (
      <>
        <P>
          The Templates section in the Control Panel is where administrators manage the content
          templates used for automated notifications, reports, and driver messages. These are
          organisation-wide defaults that apply to all alert events.
        </P>
        <H2>Email templates</H2>
        <P>
          Customise the HTML body of email alerts and scheduled reports. Use the built-in template
          editor with a preview pane to see how the email will render in a mail client.
        </P>
        <H2>SMS templates</H2>
        <P>
          Define the text content for SMS alert messages. Keep them concise — under 160 characters
          — to avoid multi-part SMS charges. Supported variables include{" "}
          <Code>{"{vehicle_name}"}</Code>, <Code>{"{speed}"}</Code>, <Code>{"{address}"}</Code>,
          and <Code>{"{timestamp}"}</Code>.
        </P>
        <H2>Chat quick-replies</H2>
        <P>
          Pre-define quick-reply messages that fleet managers can send to drivers with a single
          click, without typing. Examples: &ldquo;Proceed to next stop&rdquo;, &ldquo;Call base
          immediately&rdquo;, &ldquo;Vehicle inspection required&rdquo;.
        </P>
        <Callout type="info">
          Template changes take effect immediately — the next alert or message will use the
          updated template content.
        </Callout>
      </>
    ),
  },
  {
    slug: "tools",
    sectionId: "control-panel",
    title: "Tools",
    content: (
      <>
        <P>
          The Tools section in the Control Panel provides utility functions for data management,
          device diagnostics, and system health monitoring.
        </P>
        <H2>Data import</H2>
        <P>
          Bulk-import vehicles, drivers, geofences, or POIs from CSV or KML files. Each import
          type has a downloadable template. After upload, the system validates each row and shows
          any errors before committing the data.
        </P>
        <H2>Data export</H2>
        <P>
          Export the complete vehicle list, driver list, or geofence definitions to CSV for use
          in external systems, spreadsheets, or backups.
        </P>
        <H2>Device ping</H2>
        <P>
          Enter any IMEI number and click <strong>Ping Device</strong> to check whether the
          device is currently connected to the NistaGPS server. The result shows connection
          status, last packet time, and IP address.
        </P>
        <H2>Geocoder test</H2>
        <P>
          Test the reverse-geocoding service by entering a GPS coordinate. The result shows the
          street address returned by the geocoder, which is the same address shown in the
          tracking view and reports.
        </P>
      </>
    ),
  },
  {
    slug: "firewall",
    sectionId: "control-panel",
    title: "Firewall",
    content: (
      <>
        <P>
          The Firewall section lets administrators restrict login access to the NistaGPS web
          application by IP address, device type, or time of day. Use this to improve security
          for sensitive fleet data.
        </P>
        <H2>IP allowlist</H2>
        <P>
          Add trusted IP addresses or CIDR ranges to the allowlist. When the allowlist is enabled,
          only users connecting from listed IPs can log in — all other login attempts are blocked
          with a &ldquo;Access Restricted&rdquo; message.
        </P>
        <Callout type="warning">
          Before enabling the IP allowlist, ensure your own current IP is included. Locking
          yourself out requires contacting NistaGPS support to reset the firewall.
        </Callout>
        <H2>Login time restrictions</H2>
        <P>
          Set allowed login hours per user role. For example, Viewer accounts may only be
          permitted to log in during business hours (9 AM – 6 PM, Monday to Friday). Attempts
          outside these hours are blocked.
        </P>
        <H2>Failed login lockout</H2>
        <P>
          Configure the number of failed login attempts before an account is temporarily locked.
          The default is 5 attempts before a 30-minute lockout. Administrators can manually
          unlock accounts from User Management.
        </P>
      </>
    ),
  },

  // ─── Objects ─────────────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "objects",
    title: "Objects (Vehicles)",
    content: (
      <>
        <P>
          In NistaGPS, each physical vehicle or asset with a GPS tracker is called an{" "}
          <em>object</em>. The Objects module is where you add, configure, and manage all tracked
          assets in your fleet.
        </P>
        <H2>Adding an object</H2>
        <P>
          Navigate to <strong>Vehicles</strong> in the sidebar and click{" "}
          <strong>Add Vehicle</strong>. Required fields are:
        </P>
        <UL>
          <LI>
            <strong>Name</strong> — a human-readable label (e.g. "Truck 01 - KA01AB1234")
          </LI>
          <LI>
            <strong>IMEI</strong> — the 15-digit unique identifier of the GPS device
          </LI>
          <LI>
            <strong>Protocol</strong> — the communication protocol your device uses (e.g. GT06)
          </LI>
        </UL>
        <H2>Object settings</H2>
        <P>
          Each object has configurable settings: icon style, colour, speed limit threshold,
          odometer value, fuel capacity, and custom fields. Access these by clicking the gear icon
          next to any vehicle in the Vehicles list.
        </P>
        <H2>Bulk import</H2>
        <P>
          To add many vehicles at once, use the CSV import feature. Download the template, fill in
          your vehicle details, and upload the file. The system validates each row and shows a
          preview before committing.
        </P>
        <Callout type="info">
          IMEI numbers must be unique across your entire organisation. Attempting to register a
          duplicate IMEI will return an error.
        </Callout>
      </>
    ),
  },
  {
    slug: "groups",
    sectionId: "objects",
    title: "Groups",
    content: (
      <>
        <P>
          Groups let you organise vehicles into logical sets — by department, region, vehicle type,
          or shift. Once created, groups can be used to filter the vehicle list and scope reports.
        </P>
        <H2>Creating a group</H2>
        <P>
          Go to <strong>Vehicles &rarr; Groups</strong> and click <strong>Add Group</strong>. Enter
          a name and optionally a colour. The colour distinguishes the group in the sidebar filter
          dropdown.
        </P>
        <H2>Assigning vehicles to groups</H2>
        <P>
          Open any vehicle&apos;s settings and use the <strong>Group</strong> field to assign it.
          A vehicle can belong to multiple groups simultaneously.
        </P>
        <H2>Filtering by group</H2>
        <P>
          In the left side panel, use the group dropdown above the vehicle list to show only
          vehicles from a specific group. The map also zooms to fit the selected group.
        </P>
      </>
    ),
  },
  {
    slug: "drivers",
    sectionId: "objects",
    title: "Drivers",
    content: (
      <>
        <P>
          The Drivers module tracks which driver is operating which vehicle at any point in time.
          Driver identification is done via RFID/iButton tags or by manual trip assignment.
        </P>
        <H2>Adding a driver</H2>
        <P>
          Navigate to <strong>Vehicles &rarr; Drivers</strong> and click{" "}
          <strong>Add Driver</strong>. Enter the driver&apos;s name, phone number, and optionally
          their licence number and expiry date. If using RFID, enter the tag ID.
        </P>
        <H2>Driver assignment</H2>
        <P>
          When a driver touches their RFID tag to the in-vehicle reader, NistaGPS automatically
          links that driver to the vehicle for the duration of the trip. Manual assignments can be
          made from the vehicle details panel.
        </P>
        <H2>Driver reports</H2>
        <P>
          Once drivers are assigned to trips, the Reports module can generate driver-specific
          summaries showing distance driven, idle time, speeding events, and trip count for any
          date range.
        </P>
      </>
    ),
  },
  {
    slug: "passengers",
    sectionId: "objects",
    title: "Passengers & Trailers",
    content: (
      <>
        <P>
          Beyond drivers, NistaGPS lets you register passengers and trailers as additional entities
          that can be associated with a vehicle during a trip.
        </P>
        <H2>Passengers</H2>
        <P>
          Passengers are named individuals who regularly travel in your vehicles — for example, in
          a school bus or shuttle service. Register passengers from{" "}
          <strong>Vehicles &rarr; Passengers</strong>. Passenger check-in can be manual or
          automatic via RFID if your vehicle is equipped with a reader.
        </P>
        <H2>Trailers</H2>
        <P>
          Trailers are physical assets (cargo trailers, equipment) that are attached to a towing
          vehicle. Register trailers from <strong>Vehicles &rarr; Trailers</strong>. When a trailer
          is attached to a vehicle, the association is recorded and appears in trip reports.
        </P>
        <H2>Reporting</H2>
        <P>
          Passenger and trailer associations are included in trip reports, allowing you to generate
          manifests, cargo tracking records, or mileage claims for specific assets.
        </P>
      </>
    ),
  },

  {
    slug: "tasks",
    sectionId: "objects",
    title: "Tasks",
    content: (
      <>
        <P>
          The Tasks module lets you create scheduled work orders and to-do items linked to specific
          vehicles or drivers. Tasks appear in the tracking view as reminders and can be marked
          complete from the mobile app.
        </P>
        <H2>Creating a task</H2>
        <P>
          Go to <strong>Objects &rarr; Tasks</strong> and click <strong>Add Task</strong>. Enter a
          title, assign a vehicle or driver, set a due date and optional location. You can attach
          notes or documents to the task.
        </P>
        <H2>Task types</H2>
        <UL>
          <LI>
            <strong>Vehicle service</strong> — schedule oil change, tyre rotation, or other routine
            maintenance
          </LI>
          <LI>
            <strong>Driver task</strong> — delivery confirmation, inspection checklist, or admin
            form
          </LI>
          <LI>
            <strong>Location task</strong> — tied to a geofence; completes automatically when the
            vehicle enters the zone
          </LI>
        </UL>
        <H2>Status tracking</H2>
        <P>
          Tasks move through statuses: <em>Pending</em>, <em>In Progress</em>,{" "}
          <em>Completed</em>, and <em>Overdue</em>. Overdue tasks generate an alert if configured
          in Alert Settings.
        </P>
      </>
    ),
  },
  {
    slug: "rfid-ibutton",
    sectionId: "objects",
    title: "RFID / iButton",
    content: (
      <>
        <P>
          NistaGPS supports driver identification via RFID cards and iButton (Dallas key) tokens.
          When a driver presents their credential to the in-vehicle reader, the system logs who is
          driving the vehicle and links subsequent GPS data to that driver.
        </P>
        <H2>How it works</H2>
        <P>
          The GPS tracker device includes an RFID reader port or iButton socket. When the driver
          touches their card/key to the reader, the device sends the credential ID in the next GPS
          packet. NistaGPS matches the ID to the registered driver and marks them as active on
          that vehicle.
        </P>
        <H2>Registering credentials</H2>
        <P>
          Go to <strong>Objects &rarr; Drivers</strong>, open a driver profile, and enter the RFID
          card number or iButton ID in the <strong>Identifier</strong> field. The identifier is
          usually printed on the card or can be read with an NFC reader app on Android.
        </P>
        <H2>Unidentified driving</H2>
        <P>
          If a vehicle moves without a recognised RFID/iButton being presented, NistaGPS logs the
          trip as &ldquo;Driver Unknown&rdquo;. You can configure an alert to notify managers
          when this occurs.
        </P>
      </>
    ),
  },
  {
    slug: "dtc",
    sectionId: "objects",
    title: "Fault Codes (DTC)",
    content: (
      <>
        <P>
          NistaGPS can display Diagnostic Trouble Codes (DTCs) from the vehicle&apos;s OBD-II
          port when your GPS tracker supports the OBD-II protocol. DTCs indicate engine faults and
          warning light conditions.
        </P>
        <H2>Requirements</H2>
        <UL>
          <LI>An OBD-II compatible GPS tracker (e.g. Teltonika FMB series with OBDII cable)</LI>
          <LI>Vehicle must be OBD-II compliant (most vehicles manufactured after 2000)</LI>
          <LI>DTC data must be enabled in the tracker&apos;s configuration</LI>
        </UL>
        <H2>Viewing fault codes</H2>
        <P>
          Open any vehicle in the tracking view and click the <strong>DTC</strong> tab in the
          vehicle information panel. The tab shows a list of active fault codes with their
          standardised descriptions.
        </P>
        <H2>Common codes</H2>
        <UL>
          <LI>
            <Code>P0XXX</Code> — powertrain codes (engine, transmission)
          </LI>
          <LI>
            <Code>B0XXX</Code> — body codes (airbag, climate control)
          </LI>
          <LI>
            <Code>C0XXX</Code> — chassis codes (ABS, suspension)
          </LI>
          <LI>
            <Code>U0XXX</Code> — network / communication codes
          </LI>
        </UL>
        <Callout type="warning">
          NistaGPS displays the raw DTC codes. Consult a qualified mechanic to diagnose and repair
          the underlying issue before clearing codes.
        </Callout>
      </>
    ),
  },
  {
    slug: "maintenance",
    sectionId: "objects",
    title: "Maintenance",
    content: (
      <>
        <P>
          The Maintenance module tracks scheduled service intervals for each vehicle and alerts
          you when a service is due. This helps prevent costly breakdowns caused by missed
          servicing.
        </P>
        <H2>Setting up a maintenance schedule</H2>
        <P>
          Open a vehicle&apos;s settings from the Vehicles list and go to the{" "}
          <strong>Maintenance</strong> tab. Click <strong>Add Interval</strong>. Choose a trigger:
        </P>
        <UL>
          <LI>
            <strong>Distance</strong> — e.g. every 10,000 km
          </LI>
          <LI>
            <strong>Engine hours</strong> — e.g. every 250 hours
          </LI>
          <LI>
            <strong>Calendar</strong> — e.g. every 6 months
          </LI>
        </UL>
        <H2>Reminders</H2>
        <P>
          Set a reminder lead time (e.g. 500 km before the service is due). When the vehicle
          approaches that threshold, a warning badge appears on the vehicle in the tracking view
          and email notifications are sent to the configured recipients.
        </P>
        <H2>Logging completed service</H2>
        <P>
          After a vehicle is serviced, click <strong>Log Service</strong> on the maintenance
          record. Enter the date, mileage, service centre name, and cost. This resets the
          reminder counter and creates a permanent service history record.
        </P>
      </>
    ),
  },
  {
    slug: "expenses",
    sectionId: "objects",
    title: "Expenses",
    content: (
      <>
        <P>
          The Expenses module records running costs for each vehicle — fuel fill-ups, tolls,
          repairs, and other operational expenses. This data feeds into fleet cost reports.
        </P>
        <H2>Adding an expense</H2>
        <P>
          Open a vehicle from the Vehicles list and go to the <strong>Expenses</strong> tab. Click{" "}
          <strong>Add Expense</strong>. Fill in:
        </P>
        <UL>
          <LI>
            <strong>Type</strong> — Fuel, Toll, Repair, Insurance, or Custom
          </LI>
          <LI>
            <strong>Amount</strong> — cost in your local currency
          </LI>
          <LI>
            <strong>Date</strong> — when the expense occurred
          </LI>
          <LI>
            <strong>Notes</strong> — optional description (e.g. vendor name, invoice number)
          </LI>
        </UL>
        <H2>Fuel entries</H2>
        <P>
          For fuel entries, also enter the number of litres filled and the current odometer
          reading. NistaGPS calculates litres per 100 km and tracks fuel efficiency trends over
          time.
        </P>
        <H2>Cost reports</H2>
        <P>
          All expenses are included in the Fleet Cost report available in the Reports module.
          Filter by vehicle, date range, or expense type to analyse costs per route or department.
        </P>
      </>
    ),
  },
  {
    slug: "object-control",
    sectionId: "objects",
    title: "Object Control",
    content: (
      <>
        <P>
          Object Control gives you direct interaction capabilities with a tracked vehicle — sending
          commands, requesting live data, and remote immobilisation (where supported).
        </P>
        <H2>Control panel</H2>
        <P>
          Select a vehicle on the map and click the <strong>Control</strong> button in the vehicle
          info panel. The Control Panel shows the device status, last command, and available
          actions.
        </P>
        <H2>Available actions</H2>
        <UL>
          <LI>
            <strong>Request location</strong> — force the device to send an immediate GPS update
          </LI>
          <LI>
            <strong>Reboot device</strong> — restart the device firmware remotely
          </LI>
          <LI>
            <strong>Set tracking interval</strong> — change how frequently the device sends GPS
            data (1 second to 5 minutes)
          </LI>
          <LI>
            <strong>Activate output</strong> — toggle a relay (e.g. engine cut, door lock) if
            the device is wired accordingly
          </LI>
          <LI>
            <strong>Custom SMS command</strong> — send a raw SMS command string to the device
          </LI>
        </UL>
        <Callout type="warning">
          Remote immobilisation (engine cut) commands should only be issued when the vehicle is
          confirmed stationary. Never activate during driving.
        </Callout>
      </>
    ),
  },
  {
    slug: "image-gallery",
    sectionId: "objects",
    title: "Image Gallery",
    content: (
      <>
        <P>
          The Image Gallery stores photos associated with a vehicle — photos taken by a dashcam,
          uploaded by a driver from the mobile app, or attached to expense or maintenance records.
        </P>
        <H2>Viewing the gallery</H2>
        <P>
          Open a vehicle from the Vehicles list and click the <strong>Images</strong> tab. Photos
          are displayed in a grid sorted by capture date. Click any photo to enlarge it and see
          the associated timestamp and GPS location.
        </P>
        <H2>Dashcam integration</H2>
        <P>
          If your GPS device supports 4G dashcam functionality, photos can be requested remotely
          via the Control Panel. The device captures a photo from the camera and uploads it to
          NistaGPS automatically.
        </P>
        <H2>Driver photo uploads</H2>
        <P>
          Drivers using the GPS Tracker mobile app can upload photos from their phone. These
          photos are linked to the current trip and vehicle automatically.
        </P>
        <Callout type="info">
          Image storage is subject to your plan&apos;s retention limit. Older images may be
          automatically deleted when storage capacity is reached.
        </Callout>
      </>
    ),
  },
  {
    slug: "video-gallery",
    sectionId: "objects",
    title: "Video Gallery",
    content: (
      <>
        <P>
          The Video Gallery stores dashcam video clips associated with events — automatic
          recordings triggered by harsh braking, collisions, or manual requests.
        </P>
        <H2>Requirements</H2>
        <UL>
          <LI>A 4G-enabled GPS tracker with built-in or connected dashcam</LI>
          <LI>Premium subscription plan (video storage is not included in Basic/Standard)</LI>
          <LI>Dashcam configured to send video to NistaGPS on event trigger</LI>
        </UL>
        <H2>Requesting a video clip</H2>
        <P>
          From the Control Panel for a vehicle, click <strong>Request Video</strong>. Select a
          time window (past 30 seconds to 5 minutes). The device uploads the clip from its local
          storage when it next has strong mobile data connectivity.
        </P>
        <H2>Automatic recordings</H2>
        <P>
          Configure the dashcam to automatically upload clips when harsh braking, acceleration,
          or collision events are detected. These clips appear in the Video Gallery tagged with
          the event type and GPS location.
        </P>
      </>
    ),
  },
  {
    slug: "chat",
    sectionId: "objects",
    title: "Chat",
    content: (
      <>
        <P>
          The Chat module provides a direct messaging channel between fleet managers and drivers.
          Messages are delivered through the GPS Tracker mobile app on the driver&apos;s phone.
        </P>
        <H2>Sending a message</H2>
        <P>
          Select a vehicle or driver from the tracking view and click the{" "}
          <strong>Chat</strong> button. Type your message and click <strong>Send</strong>. The
          message is delivered to the driver&apos;s mobile app immediately if they are online.
        </P>
        <H2>Message history</H2>
        <P>
          The Chat tab on any vehicle shows the full message history between the fleet manager and
          the assigned driver for that vehicle. Messages are timestamped and show read status.
        </P>
        <H2>Pre-defined messages</H2>
        <P>
          Set up quick-reply templates for common instructions (e.g. &ldquo;Proceed to
          warehouse&rdquo;, &ldquo;Call the office&rdquo;) to save time when dispatching drivers.
          Templates are configured in <strong>Control Panel &rarr; Templates</strong>.
        </P>
        <Callout type="info">
          Drivers must have the GPS Tracker app installed and be logged in to receive chat
          messages. Messages sent while the driver is offline are delivered when they reconnect.
        </Callout>
      </>
    ),
  },
  {
    slug: "markers",
    sectionId: "objects",
    title: "Markers",
    content: (
      <>
        <P>
          Markers (also called Points of Interest or POIs) are named locations pinned on the map.
          They serve as reference points for drivers and appear as icons on the tracking map for
          all users.
        </P>
        <H2>Creating a marker</H2>
        <P>
          Right-click anywhere on the map and choose <strong>Add Marker</strong>, or navigate to{" "}
          <strong>Places &rarr; Markers</strong> and click <strong>Add</strong>. Enter a name,
          choose an icon, and set the coordinates (by clicking on the map or entering lat/lng
          directly).
        </P>
        <H2>Marker categories</H2>
        <P>
          Organise markers into categories — warehouses, customer sites, fuel stations, repair
          centres — for easy filtering. Each category can have its own icon colour.
        </P>
        <H2>Sharing markers</H2>
        <P>
          Markers are visible to all users in your organisation. Drivers using the GPS Tracker app
          can view markers on their in-app map for navigation reference.
        </P>
      </>
    ),
  },
  {
    slug: "routes",
    sectionId: "objects",
    title: "Routes",
    content: (
      <>
        <P>
          Routes are predefined paths that vehicles are expected to follow. You can draw planned
          routes on the map and configure alerts when a vehicle deviates from the expected path.
        </P>
        <H2>Creating a route</H2>
        <P>
          Go to <strong>Places &rarr; Routes</strong> and click <strong>Add Route</strong>. Click
          on the map to add waypoints. NistaGPS connects them with straight lines (as-the-crow-flies
          routing). For road-snapping, use the <strong>Snap to Road</strong> option.
        </P>
        <H2>Route corridor</H2>
        <P>
          Set a corridor width (e.g. 500 metres) around the route path. When a vehicle drifts
          outside this corridor, a route deviation alert fires — useful for verifying delivery
          drivers stay on approved roads.
        </P>
        <H2>Route assignment</H2>
        <P>
          Assign a route to a vehicle or group from the vehicle settings page. The assigned route
          appears on the map when that vehicle is selected, with colour coding showing on-route vs
          off-route segments during playback.
        </P>
      </>
    ),
  },
  {
    slug: "zones",
    sectionId: "objects",
    title: "Zones (Geofences)",
    content: (
      <>
        <P>
          Zones — also called Geofences — are virtual boundaries drawn on the map. When a vehicle
          enters or exits a zone, NistaGPS logs the event and optionally sends a notification.
        </P>
        <H2>Zone shapes</H2>
        <UL>
          <LI>
            <strong>Circle</strong> — click a centre point and set a radius in metres
          </LI>
          <LI>
            <strong>Rectangle</strong> — click two corners to define a bounding box
          </LI>
          <LI>
            <strong>Polygon</strong> — click to add vertices for any irregular shape
          </LI>
        </UL>
        <H2>Trigger settings</H2>
        <P>
          Each zone can trigger on <strong>Enter</strong>, <strong>Exit</strong>, or{" "}
          <strong>Both</strong>. You can also set time restrictions — for example, trigger only
          if the vehicle enters outside of business hours.
        </P>
        <H2>Importing zones</H2>
        <P>
          Import zone boundaries from a KML file (exported from Google My Maps or any GIS tool)
          using <strong>Places &rarr; Zones &rarr; Import KML</strong>. This is faster than
          redrawing complex boundaries manually.
        </P>
      </>
    ),
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "events",
    title: "Events Overview",
    content: (
      <>
        <P>
          Events are automatically logged records of significant conditions detected for your
          vehicles. NistaGPS monitors each vehicle&apos;s GPS stream continuously and raises events
          when configured thresholds are crossed.
        </P>
        <H2>Standard event types</H2>
        <UL>
          <LI>
            <strong>Speeding</strong> — vehicle exceeded the configured speed limit
          </LI>
          <LI>
            <strong>Ignition On / Off</strong> — vehicle engine started or stopped
          </LI>
          <LI>
            <strong>Geofence Enter / Exit</strong> — vehicle crossed a geofence boundary
          </LI>
          <LI>
            <strong>Idle</strong> — engine on but stationary for longer than the configured
            threshold
          </LI>
          <LI>
            <strong>Harsh Acceleration / Braking</strong> — rapid change in speed detected
          </LI>
          <LI>
            <strong>Low Battery</strong> — device internal battery below 20%
          </LI>
          <LI>
            <strong>GPS Signal Lost</strong> — no satellite fix for more than 5 minutes
          </LI>
        </UL>
        <H2>Viewing events</H2>
        <P>
          Open the <strong>Events</strong> tab in the bottom panel to see a live feed of recent
          events. Click any event to jump to that vehicle on the map at the time the event
          occurred.
        </P>
        <H2>Event history</H2>
        <P>
          Historical events for any vehicle can be queried from the History module. Use the date
          range picker and event type filter to find specific incidents.
        </P>
      </>
    ),
  },
  {
    slug: "alert-settings",
    sectionId: "events",
    title: "Alert Settings",
    content: (
      <>
        <P>
          Alert Settings let you control which events trigger notifications, the notification
          channels (push, SMS, email), and time-based restrictions on when alerts fire.
        </P>
        <H2>Configuring alerts</H2>
        <P>
          Navigate to <strong>Alert Settings</strong> from the sidebar. For each event type,
          toggle it on or off and select the delivery channels. You can configure alerts globally
          or per vehicle from the vehicle settings panel.
        </P>
        <H2>Speed threshold</H2>
        <P>
          Set a fleet-wide default speed limit for speeding alerts. Individual vehicles can
          override this default — useful if you have a mix of city delivery vehicles and motorway
          trucks with different legal speed limits.
        </P>
        <H2>Quiet hours</H2>
        <P>
          Set quiet hours to suppress alerts outside business hours. For example, you may not want
          SMS alerts for ignition-on events at 3 AM if a vehicle is used after hours by an
          authorised driver.
        </P>
        <Callout type="tip">
          For driver-facing applications, limit alerts to critical events only (harsh braking,
          speeding) to avoid notification fatigue.
        </Callout>
      </>
    ),
  },

  // ─── Templates ───────────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "templates",
    title: "Notification Templates",
    content: (
      <>
        <P>
          Notification templates define the content of messages sent when an event fires. Templates
          are shared across email and SMS channels but can be customised independently.
        </P>
        <H2>Template variables</H2>
        <P>
          Use double-brace placeholders in your template text. NistaGPS replaces them with live
          values when sending the notification:
        </P>
        <UL>
          <LI>
            <Code>{"{vehicle_name}"}</Code> — the vehicle display name
          </LI>
          <LI>
            <Code>{"{event_type}"}</Code> — the type of event (e.g. "Speeding")
          </LI>
          <LI>
            <Code>{"{speed}"}</Code> — current speed in km/h
          </LI>
          <LI>
            <Code>{"{address}"}</Code> — reverse-geocoded street address
          </LI>
          <LI>
            <Code>{"{timestamp}"}</Code> — date and time of the event
          </LI>
          <LI>
            <Code>{"{driver_name}"}</Code> — assigned driver (if available)
          </LI>
        </UL>
        <H2>Example SMS template</H2>
        <Pre>{`Alert: {vehicle_name} is speeding at {speed} km/h\nLocation: {address}\nTime: {timestamp}`}</Pre>
        <H2>Email templates</H2>
        <P>
          Email templates support basic HTML formatting. Keep the layout simple — most email
          clients have limited CSS support. Use tables for layout and inline styles for colours.
        </P>
        <Callout type="info">
          Keep SMS templates under 160 characters to avoid messages splitting into multiple
          segments, which increases cost.
        </Callout>
      </>
    ),
  },

  // ─── KML ─────────────────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "kml",
    title: "KML Import & Export",
    content: (
      <>
        <P>
          KML (Keyhole Markup Language) is an open format used by Google Maps, Google Earth, and
          GIS tools to share geographic data. NistaGPS supports importing KML files to add
          geofences and POIs, and exporting fleet data as KML.
        </P>
        <H2>Importing KML</H2>
        <P>
          Go to <strong>Geofences</strong> or <strong>POIs</strong> and click{" "}
          <strong>Import KML</strong>. Select a <Code>.kml</Code> or <Code>.kmz</Code> file.
          NistaGPS parses the file and shows a preview of the boundaries or markers found. Confirm
          to add them to your account.
        </P>
        <H2>Exporting route history as KML</H2>
        <P>
          From the History module, after loading a vehicle&apos;s route, click{" "}
          <strong>Export &rarr; KML</strong>. The downloaded file can be opened in Google Earth to
          view the route in 3D with street-level detail.
        </P>
        <H2>Supported KML elements</H2>
        <UL>
          <LI>Placemarks (points) — imported as POIs</LI>
          <LI>Polygons — imported as polygon geofences</LI>
          <LI>LineStrings — imported as routes</LI>
          <LI>Folders — used to organise imported elements into groups</LI>
        </UL>
        <Callout type="tip">
          Use KML to migrate existing geofences and POIs from Google My Maps or other mapping
          tools into NistaGPS without re-drawing them manually.
        </Callout>
      </>
    ),
  },

  // ─── SMS ─────────────────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "sms",
    title: "SMS Commands",
    content: (
      <>
        <P>
          Many GPS tracker devices support two-way SMS communication — you can send commands to
          the device and receive responses, all without physical access to the vehicle. NistaGPS
          provides a command interface for supported devices.
        </P>
        <H2>Sending a command</H2>
        <P>
          Select a vehicle in the tracking view and click the <strong>Command</strong> button in
          the vehicle info panel. Choose a command from the list or enter a custom command string.
          Click <strong>Send</strong> — NistaGPS forwards the command to the device via SMS or the
          TCP connection.
        </P>
        <H2>Common commands</H2>
        <UL>
          <LI>
            <strong>Get Location</strong> — request an immediate GPS fix and response
          </LI>
          <LI>
            <strong>Reboot Device</strong> — restart the tracker&apos;s firmware
          </LI>
          <LI>
            <strong>Set APN</strong> — update the device&apos;s SIM APN settings remotely
          </LI>
          <LI>
            <strong>Set Server IP</strong> — update the server address the device connects to
          </LI>
          <LI>
            <strong>Enable / Disable Engine Cut</strong> — immobilise the vehicle (requires relay
            wiring)
          </LI>
        </UL>
        <Callout type="warning">
          Engine cut commands immobilise the vehicle immediately. Only use this feature when the
          vehicle is stationary and you have verified the driver is aware.
        </Callout>
      </>
    ),
  },
  {
    slug: "gateway",
    sectionId: "sms",
    title: "SMS Gateway Setup",
    content: (
      <>
        <P>
          The SMS Gateway mode uses an Android phone with an active SIM card to send alert
          messages. This avoids the cost of a cloud SMS API and is useful when local SIM rates are
          cheaper.
        </P>
        <H2>How it works</H2>
        <P>
          NistaGPS sends the alert message content to the SMS Gateway app via an HTTP request. The
          app then sends the SMS using the phone&apos;s SIM card, with the originating number
          being your SIM&apos;s mobile number.
        </P>
        <H2>Setup</H2>
        <UL>
          <LI>Install the SMS Gateway app on a dedicated Android phone with an active SIM</LI>
          <LI>Note the local IP shown on the app&apos;s home screen</LI>
          <LI>
            In NistaGPS Control Panel &rarr; SMS Configuration, set gateway type to{" "}
            <strong>Local HTTP</strong> and enter the phone&apos;s IP and port
          </LI>
          <LI>Send a test alert from the Control Panel to verify</LI>
        </UL>
        <H2>Limitations</H2>
        <UL>
          <LI>The gateway phone must be online and the app running (battery optimisation off)</LI>
          <LI>International SMS may be blocked by the phone carrier</LI>
          <LI>High alert volumes may be throttled to prevent spam detection</LI>
        </UL>
      </>
    ),
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────────
  {
    slug: "overview",
    sectionId: "dashboard",
    title: "Dashboard Overview",
    content: (
      <>
        <P>
          The Dashboard module provides at-a-glance summary charts and statistics for your entire
          fleet over a selected date range. It is distinct from the live tracking map — it focuses
          on aggregated historical performance metrics.
        </P>
        <H2>Key widgets</H2>
        <UL>
          <LI>
            <strong>Total distance</strong> — combined kilometres driven by all vehicles
          </LI>
          <LI>
            <strong>Engine hours</strong> — total hours of engine-on time across the fleet
          </LI>
          <LI>
            <strong>Speeding events</strong> — count of speed threshold breaches
          </LI>
          <LI>
            <strong>Trips completed</strong> — number of ignition-on to ignition-off cycles
          </LI>
          <LI>
            <strong>Top performers</strong> — drivers or vehicles with best driving scores
          </LI>
        </UL>
        <H2>Date range</H2>
        <P>
          Use the date range picker to select today, yesterday, last 7 days, last 30 days, or a
          custom range. The dashboard updates immediately without reloading the page.
        </P>
        <H2>Filtering</H2>
        <P>
          Filter the dashboard by vehicle group or individual vehicle. This is useful when
          presenting data to a specific department or region manager.
        </P>
      </>
    ),
  },
  {
    slug: "history",
    sectionId: "dashboard",
    title: "History & Playback",
    content: (
      <>
        <P>
          The History module lets you replay any vehicle&apos;s past journey on the map. Select a
          vehicle and a date range and NistaGPS draws the route taken with a timeline scrubber to
          step through the journey.
        </P>
        <H2>Opening history</H2>
        <P>
          Click <strong>History</strong> in the sidebar. Choose a vehicle from the dropdown, then
          select a start and end date. Click <strong>Load</strong> to fetch the GPS data.
        </P>
        <H2>Playback controls</H2>
        <UL>
          <LI>
            <strong>Play / Pause</strong> — start or stop the animation
          </LI>
          <LI>
            <strong>Speed selector</strong> — set playback at 1×, 2×, 5×, or 10× real time
          </LI>
          <LI>
            <strong>Scrubber</strong> — drag to any point in the journey timeline
          </LI>
          <LI>
            <strong>Previous / Next stop</strong> — jump to each ignition-off event
          </LI>
        </UL>
        <H2>Route trail</H2>
        <P>
          The route is drawn as a coloured line on the map. Solid segments represent continuous
          GPS coverage. Dashed segments indicate gaps of more than 5 minutes where no GPS data was
          received (tunnels, signal loss, or device off).
        </P>
        <Callout type="info">
          History data is retained for the number of days specified in your subscription plan.
          Data older than the retention limit is automatically archived.
        </Callout>
      </>
    ),
  },
  {
    slug: "history-graph",
    sectionId: "dashboard",
    title: "History Graph & Events",
    content: (
      <>
        <P>
          Alongside the map playback, the History module includes a data graph that plots speed,
          ignition state, and other sensor values over the selected time period.
        </P>
        <H2>Speed graph</H2>
        <P>
          The speed graph shows vehicle speed (km/h) on the Y axis against time on the X axis.
          Speeding events are highlighted in red. The graph is linked to the map — clicking a
          point on the graph moves the vehicle marker to that position on the map.
        </P>
        <H2>Ignition timeline</H2>
        <P>
          Below the speed graph is an ignition timeline bar showing engine-on periods in green and
          engine-off periods in grey. Each engine-on segment corresponds to a trip; gaps are stops.
        </P>
        <H2>Event markers</H2>
        <P>
          Events (speeding, geofence breach, harsh braking) are shown as vertical markers on the
          timeline graph. Click a marker to open the event detail popup with the exact time,
          location, and associated data.
        </P>
      </>
    ),
  },
  {
    slug: "reports",
    sectionId: "dashboard",
    title: "Reports",
    content: (
      <>
        <P>
          The Reports module generates detailed tabular and chart-based summaries of fleet
          activity. Reports can be exported as PDF or CSV.
        </P>
        <H2>Available report types</H2>
        <UL>
          <LI>
            <strong>Trip Summary</strong> — start/end location, distance, and duration for each
            trip
          </LI>
          <LI>
            <strong>Daily Mileage</strong> — total kilometres driven per vehicle per day
          </LI>
          <LI>
            <strong>Speeding Report</strong> — all speeding events with duration and max speed
          </LI>
          <LI>
            <strong>Idle Report</strong> — engine-on time with the vehicle stationary
          </LI>
          <LI>
            <strong>Geofence Report</strong> — entry/exit times for selected geofences
          </LI>
          <LI>
            <strong>Driver Behaviour</strong> — scored summary of harsh events per driver
          </LI>
          <LI>
            <strong>Fuel Usage</strong> — estimated fuel consumption based on distance and fuel
            type
          </LI>
        </UL>
        <H2>Generating a report</H2>
        <P>
          Select a report type, choose the vehicle(s) or group, set the date range, and click{" "}
          <strong>Generate</strong>. The result is displayed in-page and a download button appears
          for export.
        </P>
        <H2>Scheduled reports</H2>
        <P>
          Configure scheduled reports from <strong>Reports &rarr; Scheduled</strong>. Supported
          frequencies are daily, weekly, and monthly. Reports are delivered by email to a
          configurable recipient list.
        </P>
      </>
    ),
  },
  {
    slug: "show-point",
    sectionId: "dashboard",
    title: "Show Point & Address Search",
    content: (
      <>
        <P>
          The Show Point and Address Search tools help you navigate the map to specific locations
          without being tied to a vehicle.
        </P>
        <H2>Show point</H2>
        <P>
          Enter a GPS coordinate (latitude/longitude) in the Show Point tool and the map will zoom
          to and place a temporary marker at that location. This is useful for finding a specific
          coordinate reported by a driver, a customer, or an external system.
        </P>
        <H2>Address search</H2>
        <P>
          Type any street address, landmark, or city into the Address Search field. NistaGPS uses
          forward geocoding to find the location and centres the map on it. You can then draw a
          geofence or add a POI at that address.
        </P>
        <H2>Coordinate formats</H2>
        <P>
          NistaGPS accepts coordinates in decimal degrees format (e.g.{" "}
          <Code>12.9716, 77.5946</Code>). Degrees-minutes-seconds format is not directly supported
          — use an online converter if your data is in DMS format.
        </P>
      </>
    ),
  },

  {
    slug: "address-search",
    sectionId: "dashboard",
    title: "Address Search",
    content: (
      <>
        <P>
          The Address Search tool converts a street address or landmark name into a map location.
          It is available from the search bar in the Top Panel and from the Show Point tool in
          the map toolbar.
        </P>
        <H2>How to use</H2>
        <P>
          Type any address, business name, or landmark into the search bar. NistaGPS queries a
          geocoding service and shows the top matches in a dropdown. Click a result to centre
          the map on that location and place a temporary pin.
        </P>
        <H2>Creating a geofence at an address</H2>
        <P>
          After the map centres on an address, click <strong>Add Geofence Here</strong> in the
          location popup to immediately start drawing a geofence around that address. This is
          faster than manually navigating and drawing.
        </P>
        <H2>Coverage</H2>
        <P>
          Address search uses OpenStreetMap&apos;s Nominatim geocoder by default, which has good
          global coverage. For Indian addresses, coverage in rural areas may be limited. If an
          address is not found, try a nearby landmark or use GPS coordinates directly.
        </P>
      </>
    ),
  },
  {
    slug: "location-messages",
    sectionId: "dashboard",
    title: "Location Messages (Raw Data)",
    content: (
      <>
        <P>
          Location Messages is a developer/diagnostics tool that shows the raw GPS data packets
          received from a device. It is useful for troubleshooting and understanding exactly what
          data is being sent by a tracker.
        </P>
        <H2>Accessing raw messages</H2>
        <P>
          Select a vehicle from the tracking view and open <strong>Location Messages</strong> from
          the vehicle&apos;s detail panel. Choose a date range and click Load. Each row in the
          table represents one GPS packet received from the device.
        </P>
        <H2>Columns</H2>
        <UL>
          <LI>
            <strong>Timestamp</strong> — server-side time the packet was received
          </LI>
          <LI>
            <strong>Device time</strong> — GPS timestamp embedded in the packet by the device
          </LI>
          <LI>
            <strong>Latitude / Longitude</strong> — GPS coordinates
          </LI>
          <LI>
            <strong>Speed</strong> — speed in km/h as reported by the device
          </LI>
          <LI>
            <strong>Satellites</strong> — number of GPS satellites in view
          </LI>
          <LI>
            <strong>Raw</strong> — the full decoded packet data in JSON format
          </LI>
        </UL>
        <H2>When to use</H2>
        <P>
          If you notice the vehicle position is jumping or showing an incorrect location, Location
          Messages helps identify whether the problem is in the GPS data itself or in the
          NistaGPS processing layer.
        </P>
      </>
    ),
  },

  // ─── How To ──────────────────────────────────────────────────────────────────
  {
    slug: "add-vehicle",
    sectionId: "how-to",
    title: "How to Add a Vehicle",
    content: (
      <>
        <P>
          Adding a vehicle to NistaGPS takes under 2 minutes if you have the GPS device&apos;s
          IMEI number ready.
        </P>
        <H2>Steps</H2>
        <UL>
          <LI>Go to Vehicles in the sidebar</LI>
          <LI>Click Add Vehicle (+ button, top right)</LI>
          <LI>Enter the vehicle name (e.g. "Delivery Van 03")</LI>
          <LI>Enter the IMEI number from the back of the GPS device</LI>
          <LI>Select the protocol (GT06 for most Concox/Coban devices)</LI>
          <LI>Optionally set registration plate, fuel type, and odometer</LI>
          <LI>Click Save</LI>
        </UL>
        <P>
          The vehicle immediately appears in the object list. It will show as offline until the
          GPS device connects and sends its first update.
        </P>
      </>
    ),
  },
  {
    slug: "set-alerts",
    sectionId: "how-to",
    title: "How to Set Up Speed Alerts",
    content: (
      <>
        <P>
          Speed alerts notify you in real time when a vehicle exceeds a configured threshold.
        </P>
        <H2>Steps</H2>
        <UL>
          <LI>Go to Alert Settings from the sidebar</LI>
          <LI>Find the Speeding row and toggle it On</LI>
          <LI>Set the speed threshold (e.g. 80 km/h)</LI>
          <LI>Choose delivery channels: Push notification, SMS, and/or Email</LI>
          <LI>For SMS/Email, ensure your contact details are saved in your Profile</LI>
          <LI>Click Save Settings</LI>
        </UL>
        <P>
          To set a different speed limit for a specific vehicle, open that vehicle&apos;s settings
          in the Vehicles page and set the <strong>Speed Limit Override</strong> field.
        </P>
      </>
    ),
  },
  {
    slug: "view-history",
    sectionId: "how-to",
    title: "How to View Trip History",
    content: (
      <>
        <P>Follow these steps to replay a vehicle&apos;s journey from any past date.</P>
        <H2>Steps</H2>
        <UL>
          <LI>Click History in the sidebar</LI>
          <LI>Select the vehicle from the dropdown</LI>
          <LI>Choose a date range using the date picker (max 7 days per query for free plans)</LI>
          <LI>Click Load History</LI>
          <LI>The route appears on the map as a coloured line</LI>
          <LI>
            Press Play to animate the journey in real time, or drag the scrubber to a specific
            moment
          </LI>
        </UL>
        <Callout type="info">
          Use the speed selector (1×, 2×, 5×, 10×) to fast-forward through long journeys.
          Ignition-off stops are paused for 1 second in playback so they are visible.
        </Callout>
      </>
    ),
  },
  {
    slug: "generate-reports",
    sectionId: "how-to",
    title: "How to Generate a Trip Report",
    content: (
      <>
        <P>
          Trip reports summarise all journeys made by one or more vehicles over a selected period.
        </P>
        <H2>Steps</H2>
        <UL>
          <LI>Click Reports in the sidebar</LI>
          <LI>Select Trip Summary from the report type dropdown</LI>
          <LI>Choose the vehicle or group</LI>
          <LI>Set the date range</LI>
          <LI>Click Generate Report</LI>
          <LI>
            Review the results: each row is one trip with start/end address, distance, and duration
          </LI>
          <LI>Click Export PDF or Export CSV to download</LI>
        </UL>
      </>
    ),
  },
  {
    slug: "manage-drivers",
    sectionId: "how-to",
    title: "How to Manage Drivers",
    content: (
      <>
        <P>
          The Drivers module lets you associate named drivers with vehicle trips for accountability
          and reporting.
        </P>
        <H2>Adding a driver</H2>
        <UL>
          <LI>Go to Vehicles &rarr; Drivers</LI>
          <LI>Click Add Driver</LI>
          <LI>Enter the driver&apos;s name, phone number, and licence details</LI>
          <LI>If using RFID tags, enter the tag ID (printed on the card or read with NFC reader)</LI>
          <LI>Click Save</LI>
        </UL>
        <H2>Assigning a driver to a trip manually</H2>
        <UL>
          <LI>Open the vehicle in the tracking view</LI>
          <LI>Click Assign Driver in the info panel</LI>
          <LI>Select the driver from the list</LI>
          <LI>The assignment is recorded for the current trip</LI>
        </UL>
      </>
    ),
  },
  {
    slug: "create-geofence",
    sectionId: "how-to",
    title: "How to Create a Geofence",
    content: (
      <>
        <P>Geofences let you receive alerts when vehicles enter or leave a defined area.</P>
        <H2>Steps</H2>
        <UL>
          <LI>Click Geofences in the sidebar</LI>
          <LI>Click Add Geofence (+ button)</LI>
          <LI>Choose a shape: Circle, Rectangle, or Polygon</LI>
          <LI>Click on the map to draw the boundary</LI>
          <LI>Give the geofence a name</LI>
          <LI>Set the trigger: On Enter, On Exit, or Both</LI>
          <LI>Choose the vehicles or groups the geofence applies to</LI>
          <LI>Enable SMS or email notification if required</LI>
          <LI>Click Save</LI>
        </UL>
      </>
    ),
  },
  {
    slug: "share-tracking",
    sectionId: "how-to",
    title: "How to Share a Live Tracking Link",
    content: (
      <>
        <P>
          You can share a temporary read-only link to a vehicle&apos;s live position with clients
          or managers who don&apos;t have a NistaGPS login.
        </P>
        <H2>Steps</H2>
        <UL>
          <LI>Select a vehicle in the tracking view</LI>
          <LI>Click the Share button in the vehicle info panel</LI>
          <LI>Choose a link expiry duration (1 hour, 24 hours, 7 days)</LI>
          <LI>Copy the generated URL</LI>
          <LI>Send the URL to the recipient via WhatsApp, email, or SMS</LI>
        </UL>
        <P>
          The recipient can open the link in any browser without a NistaGPS account. They see only
          the selected vehicle&apos;s live position — no other fleet data is exposed.
        </P>
        <Callout type="warning">
          Shared links expire after the duration you set. Do not share links with sensitive
          locations for long durations.
        </Callout>
      </>
    ),
  },
  {
    slug: "export-data",
    sectionId: "how-to",
    title: "How to Export Fleet Data",
    content: (
      <>
        <P>
          NistaGPS supports exporting fleet data in several formats for spreadsheets, accounting
          software, or GIS tools.
        </P>
        <H2>Exporting reports</H2>
        <P>
          From any generated report, click <strong>Export PDF</strong> for a formatted document or{" "}
          <strong>Export CSV</strong> for raw data. CSV exports include all columns visible in the
          report table.
        </P>
        <H2>Exporting GPS history as KML</H2>
        <P>
          From the History module, after loading a route, click <strong>Export &rarr; KML</strong>
          . Open the file in Google Earth or any KML-compatible GIS application.
        </P>
        <H2>API export</H2>
        <P>
          For automated or programmatic exports, use the REST API. The{" "}
          <Code>GET /api/vehicles/:id/history</Code> endpoint returns GPS points as JSON.
        </P>
      </>
    ),
  },
  {
    slug: "maintenance",
    sectionId: "how-to",
    title: "How to Set Up Maintenance Reminders",
    content: (
      <>
        <P>
          NistaGPS can send reminders when a vehicle is due for service based on odometer reading
          or elapsed time.
        </P>
        <H2>Steps</H2>
        <UL>
          <LI>Open the vehicle settings (gear icon in the Vehicles list)</LI>
          <LI>Go to the Maintenance tab</LI>
          <LI>Click Add Reminder</LI>
          <LI>Choose the trigger type: Distance (km) or Time (months)</LI>
          <LI>Set the interval and reminder lead time (e.g. remind 500 km before due)</LI>
          <LI>Enter the notification recipients (email addresses)</LI>
          <LI>Click Save</LI>
        </UL>
        <P>
          When the vehicle approaches the maintenance threshold, NistaGPS sends reminder emails
          and shows a warning badge on the vehicle in the tracking view.
        </P>
      </>
    ),
  },
  {
    slug: "billing",
    sectionId: "how-to",
    title: "How to Renew Your Subscription",
    content: (
      <>
        <P>
          Subscriptions in NistaGPS are per-vehicle. Renewing adds days to each active
          vehicle&apos;s subscription.
        </P>
        <H2>Steps</H2>
        <UL>
          <LI>Click Renew in the sidebar, or go to your account details and click Renew Subscription</LI>
          <LI>Select the plan duration: 1 month, 3 months, 6 months, or 1 year</LI>
          <LI>Select the vehicles to renew (or select all)</LI>
          <LI>Review the total cost and click Pay Now</LI>
          <LI>Complete payment via Razorpay (UPI, credit card, net banking)</LI>
          <LI>Subscription dates update immediately after successful payment</LI>
        </UL>
        <Callout type="tip">
          Annual plans offer a significant discount over monthly billing. If your fleet size is
          stable, consider switching to annual.
        </Callout>
      </>
    ),
  },

  // ─── FAQ ─────────────────────────────────────────────────────────────────────
  {
    slug: "device-not-connecting",
    sectionId: "faq",
    title: "My device is not connecting to the server",
    content: (
      <>
        <P>
          If your GPS tracker is not appearing on the map or is shown as offline, work through the
          following checklist.
        </P>
        <H2>Checklist</H2>
        <UL>
          <LI>
            <strong>SIM card</strong> — is the SIM active and does it have a mobile data plan?
            Test by inserting it into a phone and browsing a website.
          </LI>
          <LI>
            <strong>APN settings</strong> — has the correct APN been configured on the device?
            Contact your SIM provider for APN details.
          </LI>
          <LI>
            <strong>Server address</strong> — is the device programmed with the correct IP (
            <Code>34.133.128.65</Code>) and port (<Code>5023</Code> for GT06 devices)?
          </LI>
          <LI>
            <strong>IMEI registration</strong> — is the device IMEI added to NistaGPS? Check
            Vehicles and look for the IMEI in the list.
          </LI>
          <LI>
            <strong>Power</strong> — is the device powered (connected to 12V power or charged
            battery)?
          </LI>
          <LI>
            <strong>GPS fix</strong> — bring the device outdoors in open sky for 5–10 minutes for
            an initial fix.
          </LI>
        </UL>
        <Callout type="tip">
          Send the diagnostic SMS command to your device and it will reply with its current status
          including signal strength, GPS fix quality, and server connection state.
        </Callout>
      </>
    ),
  },
  {
    slug: "location-inaccurate",
    sectionId: "faq",
    title: "The vehicle location is inaccurate or jumping",
    content: (
      <>
        <P>
          GPS accuracy depends on satellite visibility, device firmware, and the environment the
          vehicle is operating in.
        </P>
        <H2>Common causes</H2>
        <UL>
          <LI>
            <strong>Indoor or underground parking</strong> — GPS signals do not penetrate concrete
            structures. The last known position is held until satellite lock is regained.
          </LI>
          <LI>
            <strong>Urban canyons</strong> — tall buildings reflect GPS signals (multipath effect)
            causing position jumps of up to 100 metres.
          </LI>
          <LI>
            <strong>Poor antenna placement</strong> — the device antenna should face upward toward
            the sky, ideally behind the windscreen or under the roof lining.
          </LI>
          <LI>
            <strong>Firmware version</strong> — outdated device firmware can have reduced GPS
            accuracy. Check with your device supplier for updates.
          </LI>
        </UL>
        <H2>NistaGPS filtering</H2>
        <P>
          NistaGPS applies server-side filtering to discard obviously erroneous GPS points
          (positions that would require physically impossible speeds). If jumpy positions are still
          appearing, contact support with the vehicle&apos;s IMEI.
        </P>
      </>
    ),
  },
  {
    slug: "billing",
    sectionId: "faq",
    title: "Billing and payment questions",
    content: (
      <>
        <H2>What payment methods are accepted?</H2>
        <P>
          NistaGPS uses Razorpay for payment processing. Accepted methods include UPI (GPay,
          PhonePe, Paytm), credit/debit cards (Visa, Mastercard, RuPay), and net banking for all
          major Indian banks.
        </P>
        <H2>Can I get a refund?</H2>
        <P>
          Subscription fees are non-refundable once the billing period has started. If you believe
          you were charged in error, contact support at <Code>support@nistagps.com</Code> with
          your invoice number.
        </P>
        <H2>Is GST included in the price?</H2>
        <P>
          All prices displayed are exclusive of GST. GST at 18% is added at checkout. Tax invoices
          (with GSTIN) are automatically generated and emailed after each payment.
        </P>
        <H2>What happens if a payment fails?</H2>
        <P>
          If a payment fails, your vehicles remain active for a 7-day grace period. You will
          receive email reminders to update your payment method. After the grace period, vehicles
          are suspended until payment is received.
        </P>
      </>
    ),
  },
  {
    slug: "account-access",
    sectionId: "faq",
    title: "I cannot log in to my account",
    content: (
      <>
        <P>
          There are several reasons why login may fail. Here is how to resolve the most common
          ones.
        </P>
        <H2>Wrong credentials</H2>
        <P>
          Ensure you are entering your phone number in the correct format (10 digits, no country
          code or spaces). Passwords are case-sensitive. If you have forgotten your password,
          contact your fleet administrator — they can reset it from User Management in the Control
          Panel.
        </P>
        <H2>Account suspended</H2>
        <P>
          If your subscription has expired and no payment was received during the grace period,
          account access is suspended. Contact <Code>support@nistagps.com</Code> to discuss
          reactivation.
        </P>
        <H2>Account deactivated by admin</H2>
        <P>
          An administrator may have deactivated your account. Contact your fleet manager to check
          your account status.
        </P>
      </>
    ),
  },
  {
    slug: "data-retention",
    sectionId: "faq",
    title: "How long is GPS data kept?",
    content: (
      <>
        <P>Data retention depends on your subscription plan:</P>
        <UL>
          <LI>
            <strong>Basic plan</strong> — 30 days of GPS history
          </LI>
          <LI>
            <strong>Standard plan</strong> — 90 days of GPS history
          </LI>
          <LI>
            <strong>Premium plan</strong> — 365 days of GPS history
          </LI>
        </UL>
        <P>
          GPS data older than your plan&apos;s retention limit is automatically deleted. This
          includes history tracks, events, and raw location messages. Exported reports and
          downloaded files are not affected — once exported, you own the data.
        </P>
        <H2>Regulatory compliance</H2>
        <P>
          If your business requires data retention beyond one year for regulatory or insurance
          reasons, contact NistaGPS support to discuss a custom enterprise plan with extended
          retention.
        </P>
      </>
    ),
  },
  {
    slug: "api-access",
    sectionId: "faq",
    title: "Can I integrate NistaGPS with my own software?",
    content: (
      <>
        <P>
          Yes. NistaGPS provides a REST API for reading fleet data. It is available on Standard
          and Premium plans. See the API Access article in the Control Panel section for full
          documentation.
        </P>
        <H2>What can the API do?</H2>
        <UL>
          <LI>Read current vehicle positions and status</LI>
          <LI>Query historical GPS tracks</LI>
          <LI>List events and alerts</LI>
          <LI>Generate report summaries</LI>
        </UL>
        <H2>Webhooks</H2>
        <P>
          Premium plan customers can configure webhook endpoints to receive real-time event
          notifications (HTTP POST) when vehicles trigger alerts. This removes the need to poll
          the API for updates.
        </P>
      </>
    ),
  },
  {
    slug: "mobile-app",
    sectionId: "faq",
    title: "Is there a mobile app for tracking?",
    content: (
      <>
        <P>
          NistaGPS does not currently have a dedicated fleet monitoring mobile app. However, the
          web interface at <Code>nistagps.com</Code> is fully responsive and works well on
          smartphones and tablets in any modern browser.
        </P>
        <H2>Add to home screen</H2>
        <UL>
          <LI>
            <strong>Android (Chrome)</strong>: tap the three-dot menu &rarr; Add to Home Screen
          </LI>
          <LI>
            <strong>iOS (Safari)</strong>: tap the Share button &rarr; Add to Home Screen
          </LI>
        </UL>
        <H2>GPS Tracker and GPS Server</H2>
        <P>
          Related mobile apps are available: <strong>GPS Tracker</strong> turns a smartphone into
          a tracking device, and <strong>GPS Server</strong> turns a phone into a local GPS
          server. See the Mobile Applications article in the Workspace section for details.
        </P>
      </>
    ),
  },
  {
    slug: "multiple-users",
    sectionId: "faq",
    title: "Can multiple users access the same account?",
    content: (
      <>
        <P>
          Yes. NistaGPS supports multi-user access within a single organisation. Each user has
          their own login credentials and can be granted different roles and module permissions.
        </P>
        <H2>Adding users</H2>
        <P>
          Administrators can add additional user accounts from{" "}
          <strong>Control Panel &rarr; User Management</strong>. There is no extra charge per user
          account — you pay only for the vehicles you track.
        </P>
        <H2>Concurrent sessions</H2>
        <P>
          Multiple users can be logged in at the same time. All users see the same live vehicle
          data. Each user&apos;s map view, selected vehicles, and filters are independent of other
          users.
        </P>
        <H2>Role separation</H2>
        <P>
          Use role-based access to give different levels of access: dispatchers may need full
          access, field supervisors may need read-only reporting access, and customers sharing
          tracking links need no login at all.
        </P>
      </>
    ),
  },
];

// ─── Section definitions (GPS-server taxonomy: 11 sections) ──────────────────
const SECTION_DEFS: { id: string; title: string }[] = [
  { id: "create-account", title: "Create Account" },
  { id: "workspace", title: "Workspace" },
  { id: "control-panel", title: "Control Panel" },
  { id: "objects", title: "Objects" },
  { id: "events", title: "Events" },
  { id: "templates", title: "Templates" },
  { id: "kml", title: "KML" },
  { id: "sms", title: "SMS" },
  { id: "dashboard", title: "Dashboard" },
  { id: "how-to", title: "How To" },
  { id: "faq", title: "FAQ" },
];

// Build flat ordered list of all articles (order determines prev/next)
const ALL_ARTICLE_BODIES: ArticleBody[] = SECTION_DEFS.flatMap((s) =>
  ARTICLE_BODIES.filter((a) => a.sectionId === s.id),
);

// Attach prev/next pointers
export const ALL_ARTICLES: DocArticle[] = ALL_ARTICLE_BODIES.map((a, idx) => ({
  ...a,
  prev:
    idx > 0
      ? {
          slug: ALL_ARTICLE_BODIES[idx - 1].slug,
          sectionId: ALL_ARTICLE_BODIES[idx - 1].sectionId,
          title: ALL_ARTICLE_BODIES[idx - 1].title,
        }
      : undefined,
  next:
    idx < ALL_ARTICLE_BODIES.length - 1
      ? {
          slug: ALL_ARTICLE_BODIES[idx + 1].slug,
          sectionId: ALL_ARTICLE_BODIES[idx + 1].sectionId,
          title: ALL_ARTICLE_BODIES[idx + 1].title,
        }
      : undefined,
}));

// Build sections with articles
export const SECTIONS: DocSection[] = SECTION_DEFS.map((s) => ({
  ...s,
  articles: ALL_ARTICLES.filter((a) => a.sectionId === s.id),
}));

export function getSections(): DocSection[] {
  return SECTIONS;
}

export function getArticle(sectionId: string, slug: string): DocArticle | undefined {
  return ALL_ARTICLES.find((a) => a.sectionId === sectionId && a.slug === slug);
}
