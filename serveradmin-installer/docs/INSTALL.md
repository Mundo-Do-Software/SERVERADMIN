# Installation Instructions for Server Admin Environment

## Prerequisites

Before you begin the installation, ensure that you have the following prerequisites:

- A server running Ubuntu 20.04 or later.
- Root or sudo access to the server.
- Basic knowledge of using the terminal.

## Installation Steps

1. **Clone the Repository**

   Start by cloning the server admin installer repository to your local machine:

   ```bash
   git clone https://github.com/Mundo-Do-Software/SERVERADMIN.git
   cd SERVERADMIN/serveradmin-installer
   ```

2. **Run the Installation Script**

   Execute the main installation script. This script will handle the setup of the server admin environment:

   ```bash
   sudo bash scripts/install.sh
   ```

3. **Follow the Prompts**

   During the installation, you will be prompted to provide some configuration details, such as:

   - Domain name (optional)
   - Email for SSL certificates
   - Installation directory (default: `/opt/ubuntu-server-admin`)

   Make sure to provide the necessary information as prompted.

4. **Verify Installation**

   Once the installation is complete, you can verify that the services are running:

   ```bash
   sudo systemctl status ubuntu-server-admin
   sudo systemctl status nginx
   sudo systemctl status postgresql
   sudo systemctl status redis-server
   ```

5. **Access the Application**

   If you configured a domain, you can access the server admin application via your web browser at:

   ```
   http://<your-domain>
   ```

   If you did not configure a domain, you can access it using the public IP address of your server.

## Post-Installation

After installation, you may want to configure additional settings or customize the application further. Refer to the `docs/TROUBLESHOOTING.md` for common issues and solutions.

## Support

For any issues or questions, please refer to the project's GitHub repository or contact the maintainers.