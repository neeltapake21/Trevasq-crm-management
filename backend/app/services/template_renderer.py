import re
import html
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from jinja2 import Environment, select_autoescape

jinja_env = Environment(
    autoescape=select_autoescape(['html', 'xml']),
    variable_start_string="{{",
    variable_end_string="}}"
)

def render_personalized_email(
    subject_template: str,
    html_template: str,
    text_template: str,
    contact_data: Dict[str, Any],
    product_data: Dict[str, Any],
    unsubscribe_url: str,
    global_unsubscribe_url: str
) -> Tuple[str, str, str]:
    """
    Renders personalized subject, HTML body, and text alternative.
    Safely injects contact and product context.
    """
    full_name = contact_data.get("full_name") or "Valued Partner"
    name_parts = full_name.split()
    first_name = name_parts[0] if name_parts else "there"
    company = contact_data.get("company") or "your organization"
    designation = contact_data.get("designation") or "Professional"
    product_name = product_data.get("name") or "TrevasQ Solution"
    current_year = datetime.now(timezone.utc).year

    context = {
        "first_name": first_name,
        "full_name": full_name,
        "company": company,
        "designation": designation,
        "product_name": product_name,
        "unsubscribe_url": unsubscribe_url,
        "global_unsubscribe_url": global_unsubscribe_url,
        "current_year": current_year,
        "email": contact_data.get("email", "")
    }

    # Render subject
    try:
        subject_jinja = jinja_env.from_string(subject_template)
        rendered_subject = subject_jinja.render(**context)
    except Exception:
        # Fallback simple replace
        rendered_subject = subject_template
        for k, v in context.items():
            rendered_subject = rendered_subject.replace(f"{{{{{k}}}}}", str(v))

    # Render HTML body
    try:
        html_jinja = jinja_env.from_string(html_template)
        rendered_html = html_jinja.render(**context)
    except Exception:
        rendered_html = html_template
        for k, v in context.items():
            rendered_html = rendered_html.replace(f"{{{{{k}}}}}", str(v))

    # Ensure mandatory unsubscribe footer exists in HTML
    if unsubscribe_url not in rendered_html:
        footer_html = f"""
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            <p>You received this email because you opted in to receive updates about {html.escape(product_name)} from TrevasQ.</p>
            <p>
                <a href="{unsubscribe_url}" style="color: #4b5563; text-decoration: underline;">Unsubscribe from {html.escape(product_name)}</a> &bull; 
                <a href="{global_unsubscribe_url}" style="color: #4b5563; text-decoration: underline;">Unsubscribe from all emails</a>
            </p>
            <p>&copy; {current_year} TrevasQ Inc. All rights reserved.</p>
        </div>
        """
        if "</body>" in rendered_html:
            rendered_html = rendered_html.replace("</body>", f"{footer_html}</body>")
        else:
            rendered_html += footer_html

    # Render Text body
    if not text_template:
        # Generate plain text from HTML strip
        clean_text = re.sub(r'<style[^>]*>.*?</style>', '', rendered_html, flags=re.DOTALL)
        clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
        rendered_text = ' '.join(clean_text.split())
    else:
        try:
            text_jinja = jinja_env.from_string(text_template)
            rendered_text = text_jinja.render(**context)
        except Exception:
            rendered_text = text_template
            for k, v in context.items():
                rendered_text = rendered_text.replace(f"{{{{{k}}}}}", str(v))

    if unsubscribe_url not in rendered_text:
        rendered_text += f"\n\n---\nTo unsubscribe from {product_name}: {unsubscribe_url}\nTo unsubscribe from all emails: {global_unsubscribe_url}"

    return rendered_subject, rendered_html, rendered_text
