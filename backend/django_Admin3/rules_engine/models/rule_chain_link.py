"""
Rule Chain Link Model
"""
from .base import models
from .rule_chain import RuleChain
from .rule import Rule


class RuleChainLink(models.Model):
    """Links between chains and rules with execution order"""
    chain = models.ForeignKey(
        RuleChain,
        on_delete=models.CASCADE,
        related_name='links'
    )
    rule = models.ForeignKey(
        Rule,
        on_delete=models.CASCADE,
        related_name='chain_links'
    )
    execution_order = models.IntegerField(help_text="Order of execution within the chain")
    is_active = models.BooleanField(default=True)
    continue_on_failure = models.BooleanField(
        default=False,
        help_text="Continue to next rule even if this one fails"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'acted_rule_chain_links'
        verbose_name = 'Rule Chain Link'
        verbose_name_plural = 'Rule Chain Links'
        ordering = ['chain', 'execution_order']
        unique_together = [('chain', 'rule')]
    
    def __str__(self):
        return f"{self.chain.name} -> {self.rule.name} (#{self.execution_order})"