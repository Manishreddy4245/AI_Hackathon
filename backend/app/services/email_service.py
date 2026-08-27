import logging
from typing import Optional

logger = logging.getLogger("placemind.email")

class EmailService:
    """
    Abstracted Email Service.
    In development and testing environments, logs password reset dispatches cleanly to logs.
    In production environments, can be wired to SMTP or Sendgrid services via environment settings.
    """
    async def send_password_reset_email(self, to_email: str, reset_link: str, user_name: str = "User") -> bool:
        logger.info("=========================================================================")
        logger.info("  [EMAIL SERVICE] Password Reset Link Dispatched")
        logger.info("  Recipient: %s (%s)", user_name, to_email)
        logger.info("  Reset Link: %s", reset_link)
        logger.info("=========================================================================")
        return True

email_service = EmailService()
