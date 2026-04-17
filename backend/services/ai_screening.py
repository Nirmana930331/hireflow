import json
import re
import math

COMMON_SKILLS = [
    'python','javascript','typescript','react','vue','angular','node','nodejs',
    'java','golang','go','rust','c++','c#','ruby','php','swift','kotlin',
    'sql','postgresql','mysql','mongodb','redis','elasticsearch',
    'aws','gcp','azure','docker','kubernetes','terraform','ci/cd',
    'graphql','rest','grpc','kafka','rabbitmq',
    'machine learning','deep learning','pytorch','tensorflow','scikit-learn',
    'html','css','sass','tailwind','webpack','vite',
    'git','linux','bash','agile','scrum',
    'figma','sketch','product management','data analysis',
    'react native','flutter','ios','android',
    'spring','django','flask','fastapi','rails','laravel',
    'design system','accessibility','a11y','performance','security',
]

def extract_skills_from_text(text):
    if not text:
        return []
    text_lower = text.lower()
    found = []
    for skill in COMMON_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return found

def estimate_years_experience(text):
    if not text:
        return 0
    patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s+)?experience',
        r'(\d+)\+?\s*yrs?\s*(?:of\s+)?(?:exp|experience)',
        r'experience[:\s]+(\d+)\+?\s*years?',
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return min(int(match.group(1)), 30)
    year_mentions = re.findall(r'\b(20[0-9]{2})\b', text)
    if len(year_mentions) >= 2:
        years = [int(y) for y in year_mentions]
        from datetime import datetime
        current = datetime.utcnow().year
        return min(current - min(years), 30)
    return 2

def score_application(candidate_resume_text, candidate_skills_json, candidate_years_exp, job_required_skills_json, job_min_years, job_description):
    try:
        candidate_skills = json.loads(candidate_skills_json) if isinstance(candidate_skills_json, str) else (candidate_skills_json or [])
    except:
        candidate_skills = []
    try:
        required_skills = json.loads(job_required_skills_json) if isinstance(job_required_skills_json, str) else (job_required_skills_json or [])
    except:
        required_skills = []

    if not candidate_skills and candidate_resume_text:
        candidate_skills = extract_skills_from_text(candidate_resume_text)

    jd_skills = extract_skills_from_text((job_description or '') + ' ' + ' '.join(required_skills))
    all_required = list(set([s.lower() for s in required_skills] + jd_skills))
    candidate_skill_set = set(s.lower() for s in candidate_skills)

    skills_match = 0.0
    if all_required:
        matched = sum(1 for s in all_required if s in candidate_skill_set)
        skills_match = min(matched / len(all_required), 1.0) * 100
    elif candidate_skills:
        skills_match = 60.0
    else:
        skills_match = 30.0

    years = float(candidate_years_exp or 0)
    min_years = float(job_min_years or 0)
    if min_years == 0:
        exp_score = min(years * 10, 100)
    elif years >= min_years:
        extra = years - min_years
        exp_score = min(80 + extra * 4, 100)
    else:
        exp_score = max((years / min_years) * 70, 10)

    resume_text = (candidate_resume_text or '').lower()
    jd_text = (job_description or '').lower()
    jd_words = set(re.findall(r'\b\w{4,}\b', jd_text)) - {'with','that','this','have','from','they','will','your','more','also','been','were'}
    if jd_words and resume_text:
        overlap = sum(1 for w in jd_words if w in resume_text)
        relevance_score = min((overlap / len(jd_words)) * 200, 100)
    else:
        relevance_score = 50.0

    job_count = len(re.findall(r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}', resume_text))
    if years > 0 and job_count > 0:
        avg_tenure = years / job_count
        tenure_score = min(avg_tenure * 25, 100) if avg_tenure < 4 else 100
    else:
        tenure_score = 60.0

    composite = (
        skills_match * 0.40 +
        exp_score * 0.30 +
        relevance_score * 0.20 +
        tenure_score * 0.10
    )
    composite = round(min(max(composite, 0), 100), 1)

    signals = {
        'skills_match': round(skills_match, 1),
        'experience_score': round(exp_score, 1),
        'relevance_score': round(relevance_score, 1),
        'tenure_score': round(tenure_score, 1),
        'matched_skills': [s for s in all_required if s in candidate_skill_set],
        'missing_skills': [s for s in (required_skills or []) if s.lower() not in candidate_skill_set],
        'detected_skills': candidate_skills,
    }

    return composite, signals
